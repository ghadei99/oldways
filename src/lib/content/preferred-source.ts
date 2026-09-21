import type { PrismaClient } from "@prisma/client";
import { preferredSanskritSourceSlug } from "./visibility";

export async function applyPreferredSanskritSource(
  prisma: PrismaClient,
  sourceSlug = preferredSanskritSourceSlug(),
) {
  const source = await prisma.source.findUnique({ where: { slug: sourceSlug } });
  if (!source) {
    throw new Error(`Preferred Sanskrit source not found: ${sourceSlug}`);
  }

  const witnesses = await prisma.passageWitness.findMany({
    where: { sourceId: source.id },
  });

  let updated = 0;
  for (const witness of witnesses) {
    await prisma.passage.update({
      where: { id: witness.passageId },
      data: {
        textSourceId: source.id,
        originalText: witness.originalText,
        sourceText: witness.sourceText,
        encoding: witness.encoding,
        normalizedText: witness.normalizedText,
        sourceReference: witness.sourceReference,
      },
    });
    if (witness.encoding === "IAST" && witness.sourceText) {
      const iast = witness.normalizedText;
      await prisma.transliteration.upsert({
        where: {
          passageId_scheme: { passageId: witness.passageId, scheme: "IAST" },
        },
        update: { text: iast },
        create: {
          passageId: witness.passageId,
          scheme: "IAST",
          text: iast,
        },
      });
    }
    updated += 1;
  }

  return { sourceSlug, updated };
}
