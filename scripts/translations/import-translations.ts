import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseEditorialJsonl } from "../../src/lib/translations/editorial-jsonl";
import { VISIBILITY } from "../../src/lib/content/visibility";

const prisma = new PrismaClient();
const file = process.argv[2] ?? join(process.cwd(), "data/translations/oldways-editorial.jsonl");

async function main() {
  const parsed = parseEditorialJsonl(readFileSync(file, "utf8"));
  if (parsed.errors.length) throw new Error(parsed.errors.join("\n"));

  const corpus = await prisma.corpus.findUniqueOrThrow({ where: { slug: "rigveda" } });
  const translator = await prisma.translator.upsert({
    where: { slug: "oldways-editorial" },
    update: {
      name: "Oldways Editorial Translation",
      isHistorical: false,
      notes: "Project-owned machine-assisted renderings. MACHINE_ASSISTED rows await independent editorial review; EDITORIAL rows have completed that review.",
    },
    create: {
      slug: "oldways-editorial",
      name: "Oldways Editorial Translation",
      isHistorical: false,
      notes: "Project-owned machine-assisted renderings. MACHINE_ASSISTED rows await independent editorial review; EDITORIAL rows have completed that review.",
    },
  });
  const source = await prisma.source.upsert({
    where: { slug: "oldways-editorial-translations" },
    update: sourceData(corpus.id),
    create: { slug: "oldways-editorial-translations", ...sourceData(corpus.id) },
  });

  const imported = new Set<string>();
  for (const row of parsed.rows) {
    const passage = await prisma.passage.findUnique({ where: { canonicalReference: row.ref } });
    if (!passage) throw new Error(`Missing corpus passage: ${row.ref}`);
    await prisma.translation.upsert({
      where: {
        passageId_language_translatorId: {
          passageId: passage.id,
          language: row.language,
          translatorId: translator.id,
        },
      },
      update: translationData(row, source.id),
      create: {
        passageId: passage.id,
        language: row.language,
        translatorId: translator.id,
        ...translationData(row, source.id),
      },
    });
    imported.add(`${passage.id}:${row.language}`);
  }

  const stale = await prisma.translation.findMany({
    where: { translatorId: translator.id },
    select: { id: true, passageId: true, language: true },
  });
  const staleIds = stale
    .filter((row) => !imported.has(`${row.passageId}:${row.language}`))
    .map((row) => row.id);
  if (staleIds.length) await prisma.translation.deleteMany({ where: { id: { in: staleIds } } });
  console.log(`Imported ${parsed.rows.length} Oldways editorial translations; removed ${staleIds.length} stale rows.`);
}

function sourceData(corpusId: string) {
  return {
    corpusId,
    kind: "translation",
    title: "Oldways Editorial Translation",
    translatorName: "Oldways editorial team",
    year: 2026,
    url: "https://huggingface.co/facebook/nllb-200-distilled-600M",
    licence: "Machine-generated editorial layer; NLLB-200 model is CC BY-NC 4.0",
    copyrightStatus: "machine_generated_nllb_cc_by_nc_4",
    attributionText: "Oldways Editorial Translation. Machine-assisted rows are visibly marked and await independent editorial review.",
    attributionRequired: true,
    visibility: VISIBILITY.PRODUCTION,
    commercialUseAllowed: false,
    digitalProject: "Oldways",
    transformationNotes: "Generated from the public-domain Ralph T. H. Griffith English translation with Meta NLLB-200 Distilled 600M (CC BY-NC 4.0 model). Earlier spotlight drafts may also consult the Sanskrit/IAST witness. Machine assistance supports broad access; no row is presented as independently reviewed unless its status is EDITORIAL.",
    internalNotes: "Import source: data/translations/oldways-editorial.jsonl",
  };
}

function translationData(
  row: { text: string; status: string },
  sourceId: string,
) {
  return {
    text: row.text,
    sourceId,
    historicalWorkId: null,
    workTitle: "Oldways Editorial Translation",
    publicationYear: 2026,
    edition: "Living editorial edition",
    copyrightStatus: "machine_generated_nllb_cc_by_nc_4",
    attribution: "Oldways Editorial Translation; machine-assisted and review-pending unless marked editorially reviewed.",
    status: row.status,
    visibility: VISIBILITY.PRODUCTION,
    notes: row.status === "EDITORIAL" ? "Editorially reviewed." : "Machine-assisted draft; independent editorial review pending.",
    isDemo: false,
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
