import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  parseGretilRigvedaXml,
  summarizeCorpus,
} from "../src/lib/corpus/parse-gretil-rigveda";
import { removeObsoleteSources } from "../src/lib/content/stale-sources";
import { refsFromBlock, type StoryBlock } from "../src/lib/story-body";

const prisma = new PrismaClient();
const root = process.cwd();
const rawXml = join(root, "data/raw/rigveda/sa_Rgveda-edAufrecht.xml");
const editorialPath = join(root, "data/editorial/seed.json");
const titlesPath = join(root, "data/editorial/sukta-titles.json");
const demoPath = join(root, "data/editorial/demo-translations.json");
const normalizedDir = join(root, "data/normalized/rigveda");

const SOURCE = {
  slug: "gretil-aufrecht-2019",
  kind: "digital_corpus",
  title: "GRETIL Ṛgveda-Saṃhitā (Aufrecht 1877 encoding)",
  editor: "Theodor Aufrecht; digital data entry by Barend A. Van Nooten and Gary B. Holland; conversion by Detlef Eichler; TEI by Maximilian Mehner",
  publisher: "Göttingen Register of Electronic Texts in Indian Languages (GRETIL), SUB Göttingen",
  year: 2019,
  edition: "GRETIL TEI, date 2019-10-03; printed source Aufrecht, Bonn 1877",
  url: "https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_Rgveda-edAufrecht.xml",
  licence: "CC BY-NC-SA 4.0",
  copyrightStatus: "digital_encoding_cc_by_nc_sa_4; printed_aufrecht_1877_public_domain",
  attributionText:
    "Sanskrit: GRETIL Ṛgveda-Saṃhitā, representing Theodor Aufrecht, Die Hymnen des Rigveda (Bonn, 1877). Digital file © contributors as published by GRETIL under CC BY-NC-SA 4.0. Printed edition is public domain; this is not a claim that the digital encoding is public domain.",
  attributionRequired: true,
  dateAccessed: new Date("2026-09-15"),
  visibility: "DEVELOPMENT",
  commercialUseAllowed: false,
  digitalProject: "GRETIL (SUB Göttingen)",
  transformationNotes:
    "Raw XML is not edited. Ingest parses <lg xml:id> / <l>, keeps <orig> in sourceText, generates IAST and Devanagari. Development/research source only; CC BY-NC-SA 4.0 forbids commercial use of this encoding.",
  internalNotes:
    "DEVELOPMENT / RESEARCH SOURCE. Primary ingest file is the TEI XML (accents in orig). Plaintext transformation lacks orig accents. Non-commercial ShareAlike licence applies to the digital file. Not a production-safe commercial corpus.",
};

type Editorial = {
  themes: { slug: string; title: string; description: string }[];
  figures: { slug: string; name: string; kind: string }[];
  stories: {
    slug: string;
    title: string;
    subtitle: string;
    summary: string;
    kind?: string;
    primarySourceLabel?: string;
    relatedStorySlugs?: string[];
    layerNote: string;
    themeSlugs: string[];
    figureSlugs: string[];
    primaryRange: string[];
    body: { blocks: StoryBlock[] };
  }[];
};

type SuktaTitle = {
  mandala: number;
  sukta: number;
  title: string;
  kind?: string;
  context?: string;
  themes?: string[];
};
type DemoTranslation = {
  canonicalReference: string;
  language: string;
  text: string;
  translatorSlug: string;
};

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export async function importRigveda() {
  const startedAt = new Date();
  if (!existsSync(rawXml)) {
    throw new Error(
      `Missing ${rawXml}. Run: npx tsx scripts/fetch-rigveda-source.ts`,
    );
  }

  const xml = readFileSync(rawXml, "utf8");
  const parsed = parseGretilRigvedaXml(xml, { expectComplete: true });
  const summary = summarizeCorpus(parsed.verses);

  mkdirSync(normalizedDir, { recursive: true });
  writeFileSync(
    join(normalizedDir, "passages.jsonl"),
    parsed.verses
      .map((v) =>
        JSON.stringify({
          canonicalReference: v.canonicalReference,
          sourceReference: v.sourceReference,
          mandala: v.mandala,
          sukta: v.sukta,
          mantra: v.mantra,
          sourceText: v.sourceText,
          iast: v.iast,
          devanagari: v.devanagari,
        }),
      )
      .join("\n"),
  );

  const corpus = await prisma.corpus.upsert({
    where: { slug: "rigveda" },
    update: {
      abbreviation: "RV",
      title: "Rigveda",
      originalTitle: "ऋग्वेद",
      tradition: "vedic",
      language: "sanskrit",
      description:
        "Ṛgveda-Saṃhitā in ten maṇḍalas. Displayed Sanskrit currently uses the GRETIL Aufrecht encoding (CC BY-NC-SA 4.0; development/research, not a commercial-safe corpus).",
    },
    create: {
      slug: "rigveda",
      abbreviation: "RV",
      title: "Rigveda",
      originalTitle: "ऋग्वेद",
      tradition: "vedic",
      language: "sanskrit",
      description:
        "Ṛgveda-Saṃhitā in ten maṇḍalas. Displayed Sanskrit currently uses the GRETIL Aufrecht encoding (CC BY-NC-SA 4.0; development/research, not a commercial-safe corpus).",
    },
  });

  const textSource = await prisma.source.upsert({
    where: { slug: SOURCE.slug },
    update: { ...SOURCE, corpusId: corpus.id },
    create: { ...SOURCE, corpusId: corpus.id },
  });
  await removeObsoleteSources(prisma);

  await prisma.translator.upsert({
    where: { slug: "dev-seed-indic" },
    update: {
      name: "Development seed (working rendering)",
      isHistorical: false,
      notes:
        "Unpublished Hindi, Odia, and Bengali working renderings. Not a historical edition.",
    },
    create: {
      slug: "dev-seed-indic",
      name: "Development seed (working rendering)",
      isHistorical: false,
      notes:
        "Unpublished Hindi, Odia, and Bengali working renderings. Not a historical edition.",
    },
  });

  await prisma.translator.upsert({
    where: { slug: "dev-seed-en" },
    update: {
      name: "Development seed (English working gloss)",
      isHistorical: false,
      notes: "Unpublished working gloss. Not a historical edition.",
    },
    create: {
      slug: "dev-seed-en",
      name: "Development seed (English working gloss)",
      isHistorical: false,
      notes: "Unpublished working gloss. Not a historical edition.",
    },
  });

  const demoSource = await prisma.source.upsert({
    where: { slug: "dev-seed-renderings" },
    update: {
      corpusId: corpus.id,
      kind: "translation",
      title: "Oldways development seed renderings",
      year: 2026,
      licence: "Internal development data only",
      copyrightStatus: "unpublished_demo",
      attributionText:
        "Working renderings prepared for interface development. Not a published translation.",
      attributionRequired: true,
      visibility: "DEVELOPMENT",
      commercialUseAllowed: false,
      digitalProject: "Oldways development seeds",
      internalNotes: "Visible only outside production unless SHOW_DEMO_TRANSLATIONS=1.",
    },
    create: {
      slug: "dev-seed-renderings",
      corpusId: corpus.id,
      kind: "translation",
      title: "Oldways development seed renderings",
      year: 2026,
      licence: "Internal development data only",
      copyrightStatus: "unpublished_demo",
      attributionText:
        "Working renderings prepared for interface development. Not a published translation.",
      attributionRequired: true,
      visibility: "DEVELOPMENT",
      commercialUseAllowed: false,
      digitalProject: "Oldways development seeds",
    },
  });

  const titles: SuktaTitle[] = existsSync(titlesPath)
    ? loadJson<SuktaTitle[]>(titlesPath)
    : [];
  const titleMap = new Map(
    titles.map((t) => [`${t.mandala}.${t.sukta}`, t]),
  );

  const mandalaIds = new Map<number, string>();
  for (let n = 1; n <= 10; n++) {
    const existing = await prisma.textDivision.findFirst({
      where: {
        corpusId: corpus.id,
        parentId: null,
        divisionType: "mandala",
        number: String(n),
      },
    });
    if (existing) {
      mandalaIds.set(n, existing.id);
    } else {
      const created = await prisma.textDivision.create({
        data: {
          corpusId: corpus.id,
          divisionType: "mandala",
          number: String(n),
          title: `Maṇḍala ${n}`,
          orderIndex: n,
        },
      });
      mandalaIds.set(n, created.id);
    }
  }

  const suktaIds = new Map<string, string>();
  const suktaKeys = [...new Set(parsed.verses.map((v) => `${v.mandala}.${v.sukta}`))];
  for (const key of suktaKeys) {
    const [mandala, sukta] = key.split(".").map(Number);
    const parentId = mandalaIds.get(mandala)!;
    const meta = titleMap.get(key);
    const existing = await prisma.textDivision.findFirst({
      where: {
        corpusId: corpus.id,
        parentId,
        divisionType: "sukta",
        number: String(sukta),
      },
    });
    if (existing) {
      if (meta?.title && existing.title !== meta.title) {
        await prisma.textDivision.update({
          where: { id: existing.id },
          data: { title: meta.title },
        });
      }
      suktaIds.set(key, existing.id);
    } else {
      const created = await prisma.textDivision.create({
        data: {
          corpusId: corpus.id,
          parentId,
          divisionType: "sukta",
          number: String(sukta),
          title: meta?.title ?? null,
          orderIndex: sukta,
        },
      });
      suktaIds.set(key, created.id);
    }
  }

  const themes = existsSync(editorialPath)
    ? loadJson<Editorial>(editorialPath).themes
    : [];
  for (const theme of themes) {
    await prisma.theme.upsert({
      where: { slug: theme.slug },
      update: theme,
      create: theme,
    });
  }
  const themeRows = Object.fromEntries(
    (await prisma.theme.findMany()).map((t) => [t.slug, t]),
  );

  let upserted = 0;
  for (const verse of parsed.verses) {
    const divisionId = suktaIds.get(`${verse.mandala}.${verse.sukta}`);
    if (!divisionId) {
      parsed.malformed.push(`missing sukta row for ${verse.canonicalReference}`);
      continue;
    }
    const passage = await prisma.passage.upsert({
      where: { canonicalReference: verse.canonicalReference },
      update: {
        sourceReference: verse.sourceReference,
        divisionId,
        corpusId: corpus.id,
        textSourceId: textSource.id,
        originalText: verse.devanagari,
        sourceText: verse.sourceText,
        encoding: "IAST",
        normalizedText: verse.iast.replace(/\s+/g, " "),
        orderIndex: verse.mantra,
      },
      create: {
        canonicalReference: verse.canonicalReference,
        sourceReference: verse.sourceReference,
        corpusId: corpus.id,
        divisionId,
        textSourceId: textSource.id,
        originalText: verse.devanagari,
        sourceText: verse.sourceText,
        encoding: "IAST",
        normalizedText: verse.iast.replace(/\s+/g, " "),
        orderIndex: verse.mantra,
      },
    });
    await prisma.transliteration.upsert({
      where: {
        passageId_scheme: { passageId: passage.id, scheme: "IAST" },
      },
      update: { text: verse.iast },
      create: { passageId: passage.id, scheme: "IAST", text: verse.iast },
    });
    await prisma.passageWitness.upsert({
      where: {
        passageId_sourceId: { passageId: passage.id, sourceId: textSource.id },
      },
      update: {
        sourceReference: verse.sourceReference,
        originalText: verse.devanagari,
        sourceText: verse.sourceText,
        encoding: "IAST",
        normalizedText: verse.iast.replace(/\s+/g, " "),
        visibility: "DEVELOPMENT",
      },
      create: {
        passageId: passage.id,
        sourceId: textSource.id,
        sourceReference: verse.sourceReference,
        originalText: verse.devanagari,
        sourceText: verse.sourceText,
        encoding: "IAST",
        normalizedText: verse.iast.replace(/\s+/g, " "),
        visibility: "DEVELOPMENT",
      },
    });
    upserted += 1;
    if (upserted % 1000 === 0) {
      console.log(`upserted ${upserted}/${parsed.verses.length}`);
    }
  }

  for (const meta of titles) {
    const themeSlugs = meta.themes ?? [];
    if (!themeSlugs.length) continue;
    const passages = await prisma.passage.findMany({
      where: {
        canonicalReference: {
          startsWith: `RV.${meta.mandala}.${meta.sukta}.`,
        },
      },
    });
    for (const passage of passages) {
      for (const slug of themeSlugs) {
        const theme = themeRows[slug];
        if (!theme) continue;
        await prisma.passageTheme.upsert({
          where: {
            passageId_themeId: { passageId: passage.id, themeId: theme.id },
          },
          update: {},
          create: { passageId: passage.id, themeId: theme.id },
        });
      }
    }
  }

  const showDemo =
    process.env.NODE_ENV !== "production" ||
    process.env.SHOW_DEMO_TRANSLATIONS === "1";

  if (showDemo && existsSync(demoPath)) {
    const demos = loadJson<DemoTranslation[]>(demoPath);
    const translators = Object.fromEntries(
      (await prisma.translator.findMany()).map((t) => [t.slug, t]),
    );
    for (const demo of demos) {
      const passage = await prisma.passage.findUnique({
        where: { canonicalReference: demo.canonicalReference },
      });
      const translator = translators[demo.translatorSlug];
      if (!passage || !translator) {
        parsed.malformed.push(
          `demo translation missing passage/translator ${demo.canonicalReference}`,
        );
        continue;
      }
      const existing = await prisma.translation.findFirst({
        where: {
          passageId: passage.id,
          language: demo.language,
          translatorId: translator.id,
        },
      });
      const data = {
        text: demo.text,
        sourceId: demoSource.id,
        historicalWorkId: null,
        workTitle: "Oldways development seed renderings",
        publicationYear: 2026,
        edition: null,
        copyrightStatus: "unpublished_demo",
        attribution:
          "Working rendering. Not a historical or scholarly translation.",
        status: "WORKING_TRANSLATION",
        visibility: "DEVELOPMENT",
        notes: "Development seed — unpublished working rendering.",
        isDemo: true,
      };
      if (existing) {
        await prisma.translation.update({ where: { id: existing.id }, data });
      } else {
        await prisma.translation.create({
          data: {
            passageId: passage.id,
            language: demo.language,
            translatorId: translator.id,
            ...data,
          },
        });
      }
    }
  }

  if (existsSync(editorialPath)) {
    await importEditorial(loadJson<Editorial>(editorialPath), themeRows, parsed.malformed);
  }

  const status =
    parsed.malformed.length || parsed.duplicates.length ? "FAIL" : "PASS";
  const stats = {
    corpus: "Rigveda",
    mandalas: summary.mandalas,
    suktas: summary.suktas,
    passages: upserted,
    duplicates: parsed.duplicates.length,
    malformed: parsed.malformed.length,
    skipped: parsed.skipped.length,
    source: SOURCE.title,
    licence: SOURCE.licence,
    status,
    malformedItems: parsed.malformed,
    duplicateItems: parsed.duplicates,
  };

  await prisma.importRun.create({
    data: {
      corpusId: corpus.id,
      sourceSlug: SOURCE.slug,
      startedAt,
      finishedAt: new Date(),
      status,
      statsJson: JSON.stringify(stats),
    },
  });

  return stats;
}

async function importEditorial(
  editorial: Editorial,
  themes: Record<string, { id: string }>,
  malformed: string[],
) {
  for (const figure of editorial.figures) {
    await prisma.figure.upsert({
      where: { slug: figure.slug },
      update: figure,
      create: figure,
    });
  }

  for (const story of editorial.stories) {
    const body = JSON.stringify({
      kind: story.kind ?? null,
      primarySourceLabel: story.primarySourceLabel ?? null,
      relatedStorySlugs: story.relatedStorySlugs ?? [],
      blocks: story.body.blocks,
    });
    const saved = await prisma.story.upsert({
      where: { slug: story.slug },
      update: {
        title: story.title,
        subtitle: story.subtitle,
        summary: story.summary,
        layerNote: story.layerNote,
        body,
      },
      create: {
        slug: story.slug,
        title: story.title,
        subtitle: story.subtitle,
        summary: story.summary,
        layerNote: story.layerNote,
        body,
      },
    });

    await prisma.storyReference.deleteMany({ where: { storyId: saved.id } });
    await prisma.storyTheme.deleteMany({ where: { storyId: saved.id } });
    await prisma.storyFigure.deleteMany({ where: { storyId: saved.id } });

    let order = 0;
    const cited = new Set<string>();
    for (const block of story.body.blocks) {
      for (const ref of refsFromBlock(block)) {
        const passage = await prisma.passage.findUnique({
          where: { canonicalReference: ref },
        });
        if (!passage) {
          malformed.push(`story ${story.slug}: missing ${ref}`);
          continue;
        }
        cited.add(ref);
        await prisma.storyReference.create({
          data: {
            storyId: saved.id,
            passageId: passage.id,
            referenceType: "citation",
            orderIndex: order++,
            blockId: block.id,
          },
        });
      }
    }
    for (const ref of story.primaryRange) {
      if (cited.has(ref)) continue;
      const passage = await prisma.passage.findUnique({
        where: { canonicalReference: ref },
      });
      if (!passage) {
        malformed.push(`story ${story.slug}: missing primary ${ref}`);
        continue;
      }
      await prisma.storyReference.create({
        data: {
          storyId: saved.id,
          passageId: passage.id,
          referenceType: "primary_range",
          orderIndex: order++,
        },
      });
    }
    for (const slug of story.themeSlugs) {
      const theme = themes[slug];
      if (theme) {
        await prisma.storyTheme.create({
          data: { storyId: saved.id, themeId: theme.id },
        });
      }
    }
    for (const slug of story.figureSlugs) {
      const figure = await prisma.figure.findUnique({ where: { slug } });
      if (figure) {
        await prisma.storyFigure.create({
          data: { storyId: saved.id, figureId: figure.id },
        });
      }
    }
  }
}

function printReport(stats: Awaited<ReturnType<typeof importRigveda>>) {
  console.log(`Corpus: ${stats.corpus}`);
  console.log(`Mandalas: ${stats.mandalas}`);
  console.log(`Suktas: ${stats.suktas}`);
  console.log(`Passages/mantras: ${stats.passages}`);
  console.log(`Duplicates: ${stats.duplicates}`);
  console.log(`Malformed: ${stats.malformed}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Source: ${stats.source}`);
  console.log(`Licence: ${stats.licence}`);
  console.log(`Validation: ${stats.status}`);
  if (stats.malformedItems.length) {
    console.error(stats.malformedItems.slice(0, 20).join("\n"));
  }
}

async function main() {
  const stats = await importRigveda();
  printReport(stats);
  if (stats.status !== "PASS") process.exitCode = 1;
}

const isDirect = process.argv[1]?.includes("import-rigveda");
if (isDirect) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
