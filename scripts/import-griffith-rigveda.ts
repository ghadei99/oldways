import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { TRANSLATION_STATUS, VISIBILITY } from "../src/lib/content/visibility";

const prisma = new PrismaClient();
const root = process.cwd();
const wikisourceVerses = join(root, "data/raw/griffith/wikisource/verses.jsonl");
const localVerses = join(root, "data/raw/griffith/verses.jsonl");

type Row = { canonicalReference: string; text: string; wikisourceTitle?: string };

async function main() {
  const file = existsSync(wikisourceVerses) ? wikisourceVerses : localVerses;
  if (!existsSync(file)) {
    console.log(
      "Griffith verses.jsonl not present. Run: npx tsx scripts/fetch-griffith-wikisource.ts",
    );
    return;
  }

  const corpus = await prisma.corpus.findUnique({ where: { slug: "rigveda" } });
  if (!corpus) {
    throw new Error("Rigveda corpus missing. Import Sanskrit first.");
  }

  const historical = await prisma.source.upsert({
    where: { slug: "griffith-1896-work" },
    update: {
      corpusId: corpus.id,
      kind: "historical_work",
      title: "The Hymns of the Rigveda",
      translatorName: "Ralph T. H. Griffith",
      publisher: "E. J. Lazarus and Co., Benares",
      year: 1896,
      edition: "Second edition, 1896",
      url: "https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda",
      licence: "Public domain (historical work)",
      copyrightStatus: "public_domain",
      attributionText:
        "English translation by Ralph T. H. Griffith, The Hymns of the Rigveda (2nd ed., Benares, 1896). The printed work is in the public domain.",
      attributionRequired: true,
      visibility: VISIBILITY.PRODUCTION,
      commercialUseAllowed: true,
      digitalProject: null,
      transformationNotes:
        "Historical publication only. This record is not a digital transcription.",
    },
    create: {
      slug: "griffith-1896-work",
      corpusId: corpus.id,
      kind: "historical_work",
      title: "The Hymns of the Rigveda",
      translatorName: "Ralph T. H. Griffith",
      publisher: "E. J. Lazarus and Co., Benares",
      year: 1896,
      edition: "Second edition, 1896",
      url: "https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda",
      licence: "Public domain (historical work)",
      copyrightStatus: "public_domain",
      attributionText:
        "English translation by Ralph T. H. Griffith, The Hymns of the Rigveda (2nd ed., Benares, 1896). The printed work is in the public domain.",
      attributionRequired: true,
      visibility: VISIBILITY.PRODUCTION,
      commercialUseAllowed: true,
    },
  });

  const digital = await prisma.source.upsert({
    where: { slug: "griffith-wikisource" },
    update: {
      corpusId: corpus.id,
      kind: "digital_transcription",
      title: "Wikisource transcription of Griffith, The Hymns of the Rigveda",
      translatorName: "Ralph T. H. Griffith",
      year: 1896,
      edition: "Wikisource pages under The Hymns of the Rigveda",
      url: "https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda",
      licence: "Public domain (verse text, per Wikisource copyright table on the work)",
      copyrightStatus: "public_domain_digitization_of_pd_work",
      attributionText:
        "Digital transcription retrieved via the Wikisource MediaWiki API from pages of The Hymns of the Rigveda. Wikisource marks both the Sanskrit original and Griffith's translation as public domain worldwide (author died 100+ years ago; published before 1931). Numbered verse text only; commentary and wiki apparatus are not ingested.",
      attributionRequired: true,
      dateAccessed: new Date("2026-09-18"),
      visibility: VISIBILITY.PRODUCTION,
      commercialUseAllowed: true,
      digitalProject: "Wikisource",
      transformationNotes:
        "MediaWiki action=parse wikitext → strip header template → extract numbered verses. Historical PD status of the 1896 book is recorded separately from this digital file.",
      internalNotes: file,
    },
    create: {
      slug: "griffith-wikisource",
      corpusId: corpus.id,
      kind: "digital_transcription",
      title: "Wikisource transcription of Griffith, The Hymns of the Rigveda",
      translatorName: "Ralph T. H. Griffith",
      year: 1896,
      edition: "Wikisource pages under The Hymns of the Rigveda",
      url: "https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda",
      licence: "Public domain (verse text, per Wikisource copyright table on the work)",
      copyrightStatus: "public_domain_digitization_of_pd_work",
      attributionText:
        "Digital transcription retrieved via the Wikisource MediaWiki API. Wikisource marks Griffith's translation as public domain worldwide.",
      attributionRequired: true,
      dateAccessed: new Date("2026-09-18"),
      visibility: VISIBILITY.PRODUCTION,
      commercialUseAllowed: true,
      digitalProject: "Wikisource",
    },
  });

  const translator = await prisma.translator.upsert({
    where: { slug: "griffith" },
    update: {
      name: "Ralph T. H. Griffith",
      isHistorical: true,
      notes:
        "English verse translation, The Hymns of the Rigveda, 2nd ed., 1896. Historical work is public domain.",
    },
    create: {
      slug: "griffith",
      name: "Ralph T. H. Griffith",
      isHistorical: true,
      notes:
        "English verse translation, The Hymns of the Rigveda, 2nd ed., 1896. Historical work is public domain.",
    },
  });

  const lines = readFileSync(file, "utf8").split(/\n/).filter(Boolean);
  const byRef = new Map<string, Row[]>();
  for (const line of lines) {
    const row = JSON.parse(line) as Row;
    const list = byRef.get(row.canonicalReference) ?? [];
    list.push(row);
    byRef.set(row.canonicalReference, list);
  }

  const linkedRefs = new Set<string>();
  const report = {
    matched: 0,
    unmatched: [] as string[],
    ambiguous: [] as string[],
    parseFailure: [] as string[],
    missingSource: [] as string[],
  };

  for (const [, rows] of byRef) {
    const uniqueTexts = [...new Set(rows.map((r) => r.text.trim()))];
    if (uniqueTexts.length !== 1 || !uniqueTexts[0]) {
      const ref = rows[0]?.canonicalReference ?? "unknown";
      if (!uniqueTexts[0]) report.parseFailure.push(ref);
      else report.ambiguous.push(ref);
      continue;
    }
    const row = { ...rows[0], text: uniqueTexts[0] };
    const passage = await prisma.passage.findUnique({
      where: { canonicalReference: row.canonicalReference },
    });
    if (!passage) {
      report.unmatched.push(row.canonicalReference);
      continue;
    }
    const existing = await prisma.translation.findFirst({
      where: {
        passageId: passage.id,
        language: "en",
        translatorId: translator.id,
      },
    });
    const data = {
      text: row.text,
      sourceId: digital.id,
      historicalWorkId: historical.id,
      workTitle: historical.title,
      publicationYear: historical.year,
      edition: historical.edition,
      copyrightStatus: "public_domain",
      attribution: `${translator.name}, ${historical.title} (${historical.year}). Digital source: ${digital.title}.`,
      status: TRANSLATION_STATUS.PUBLIC_DOMAIN,
      visibility: VISIBILITY.PRODUCTION,
      notes: `Historical work: ${historical.title} (${historical.year}), public domain. Digital transcription: Wikisource MediaWiki API${row.wikisourceTitle ? ` (${row.wikisourceTitle})` : ""}.`,
      isDemo: false,
    };
    if (existing) {
      await prisma.translation.update({ where: { id: existing.id }, data });
    } else {
      await prisma.translation.create({
        data: {
          passageId: passage.id,
          language: "en",
          translatorId: translator.id,
          ...data,
        },
      });
    }
    linkedRefs.add(row.canonicalReference);
    report.matched += 1;
  }

  const stale = await prisma.translation.findMany({
    where: { translatorId: translator.id, language: "en" },
    include: { passage: { select: { canonicalReference: true } } },
  });
  let removed = 0;
  for (const row of stale) {
    if (!linkedRefs.has(row.passage.canonicalReference)) {
      await prisma.translation.delete({ where: { id: row.id } });
      removed += 1;
    }
  }

  const rigvedaPassages = await prisma.passage.findMany({
    where: { corpusId: corpus.id },
    select: { canonicalReference: true },
  });
  for (const passage of rigvedaPassages) {
    if (!linkedRefs.has(passage.canonicalReference)) {
      report.missingSource.push(passage.canonicalReference);
    }
  }

  const coverageReport = {
    generatedAt: new Date().toISOString(),
    corpusPassages: rigvedaPassages.length,
    withGriffith: report.matched,
    withoutGriffith: report.missingSource.length,
    ambiguous: report.ambiguous.length,
    ambiguousReferences: report.ambiguous,
    unmatchedSourceLines: report.unmatched.length,
    unmatchedSourceReferences: report.unmatched,
    parseFailures: report.parseFailure.length,
    parseFailureReferences: report.parseFailure,
  };
  const reportsDir = join(root, "data/reports");
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(
    join(reportsDir, "griffith-coverage.json"),
    JSON.stringify(coverageReport, null, 2),
  );

  await prisma.importRun.create({
    data: {
      corpusId: corpus.id,
      sourceSlug: digital.slug,
      startedAt: new Date(),
      finishedAt: new Date(),
      status: "PASS",
      statsJson: JSON.stringify({
        file,
        lines: lines.length,
        ...coverageReport,
        unmatched: report.unmatched.length,
        unmatchedSample: report.unmatched.slice(0, 20),
        ambiguous: report.ambiguous,
        parseFailure: report.parseFailure,
        missingSource: report.missingSource.length,
        missingSourceSample: report.missingSource.slice(0, 30),
        removedStale: removed,
      }),
    },
  });

  console.log(
    `Griffith matched: ${report.matched}; unmatched: ${report.unmatched.length}; ambiguous: ${report.ambiguous.length}; parse failure: ${report.parseFailure.length}; missing source: ${report.missingSource.length}; removed stale: ${removed}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
