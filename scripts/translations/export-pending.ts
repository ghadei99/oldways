import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const output = process.argv[2];
  const passages = await prisma.passage.findMany({
    where: {
      OR: [
        { storyReferences: { some: {} } },
        { division: { title: { not: null } } },
        { canonicalReference: { startsWith: "RV.10." } },
      ],
    },
    orderBy: { canonicalReference: "asc" },
    include: {
      division: true,
      transliterations: { where: { scheme: "IAST" } },
      translations: { where: { language: { in: ["en", "hi", "or", "bn"] } } },
      storyReferences: { select: { id: true } },
    },
  });
  const lines: string[] = [];
  for (const passage of passages) {
    const tier = passage.storyReferences.length
      ? "story_reference"
      : passage.division.title
        ? "titled_sukta"
        : passage.canonicalReference.startsWith("RV.10.")
          ? "mandala_10"
          : "remaining";
    const griffith = passage.translations.find((row) => row.language === "en")?.text ?? null;
    for (const language of ["hi", "or", "bn"] as const) {
      if (passage.translations.some((row) => row.language === language)) continue;
      lines.push(JSON.stringify({
        ref: passage.canonicalReference,
        language,
        tier,
        sanskrit: passage.originalText,
        iast: passage.transliterations[0]?.text ?? null,
        griffith,
        text: "",
        status: "MACHINE_ASSISTED",
      }));
    }
  }
  const body = lines.join("\n");
  if (output) writeFileSync(output, body);
  else process.stdout.write(`${body}\n`);
}

main().finally(() => prisma.$disconnect());
