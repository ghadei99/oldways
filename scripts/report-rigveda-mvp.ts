import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const root = process.cwd();
  const corpus = await prisma.corpus.findUniqueOrThrow({ where: { slug: "rigveda" } });
  const [passages, stories, references, brokenRefs, griffith, editorial] = await Promise.all([
    prisma.passage.count({ where: { corpusId: corpus.id } }),
    prisma.story.count(),
    prisma.storyReference.findMany({ select: { storyId: true, passageId: true } }),
    prisma.storyReference.count({ where: { passage: { corpusId: { not: corpus.id } } } }),
    prisma.translation.count({ where: { language: "en", translator: { slug: "griffith" } } }),
    prisma.translation.findMany({
      where: { translator: { slug: "oldways-editorial" } },
      select: { language: true, status: true },
    }),
  ]);
  const griffithReportPath = join(root, "data/reports/griffith-coverage.json");
  const griffithReport = JSON.parse(readFileSync(griffithReportPath, "utf8"));
  const translations = Object.fromEntries(
    ["hi", "or", "bn"].map((language) => {
      const rows = editorial.filter((row) => row.language === language);
      const machine = rows.filter((row) => row.status === "MACHINE_ASSISTED").length;
      const reviewed = rows.filter((row) => row.status === "EDITORIAL").length;
      return [language, { machine, reviewed, available: rows.length, missing: passages - rows.length }];
    }),
  );
  const report = {
    generatedAt: new Date().toISOString(),
    corpusPassages: passages,
    stories,
    storyReferenceRows: references.length,
    distinctStoryReferences: new Set(references.map((row) => row.passageId)).size,
    duplicateStoryReferenceRows:
      references.length -
      new Set(references.map((row) => `${row.storyId}:${row.passageId}`)).size,
    brokenStoryReferences: brokenRefs,
    english: {
      withGriffith: griffith,
      withoutGriffith: passages - griffith,
      ambiguous: griffithReport.ambiguous,
      unmatchedSourceLines: griffithReport.unmatchedSourceLines,
    },
    translations,
  };
  const reportsDir = join(root, "data/reports");
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(join(reportsDir, "rigveda-mvp.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
