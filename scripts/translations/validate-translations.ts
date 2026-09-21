import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseEditorialJsonl } from "../../src/lib/translations/editorial-jsonl";

const prisma = new PrismaClient();
const file = process.argv[2] ?? join(process.cwd(), "data/translations/oldways-editorial.jsonl");

export async function validateEditorialTranslations(path = file) {
  const parsed = parseEditorialJsonl(readFileSync(path, "utf8"));
  const refs = [...new Set(parsed.rows.map((row) => row.ref))];
  const passages = await prisma.passage.findMany({
    where: { canonicalReference: { in: refs } },
    select: { canonicalReference: true },
  });
  const known = new Set(passages.map((row) => row.canonicalReference));
  for (const ref of refs) {
    if (!known.has(ref)) parsed.errors.push(`missing corpus passage: ${ref}`);
  }
  return parsed;
}

async function main() {
  const result = await validateEditorialTranslations();
  if (result.errors.length) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else {
    const counts = Object.fromEntries(
      ["hi", "or", "bn"].map((language) => [
        language,
        result.rows.filter((row) => row.language === language).length,
      ]),
    );
    console.log(`Editorial translations valid: ${result.rows.length} (${JSON.stringify(counts)})`);
  }
}

if (process.argv[1]?.includes("validate-translations")) {
  main().finally(() => prisma.$disconnect());
}
