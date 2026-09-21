import type { PrismaClient } from "@prisma/client";
import { OBSOLETE_SOURCE_SLUGS } from "./visibility";

export async function removeObsoleteSources(prisma: PrismaClient) {
  const removed: string[] = [];
  for (const slug of OBSOLETE_SOURCE_SLUGS) {
    const source = await prisma.source.findUnique({ where: { slug } });
    if (!source) continue;
    const passages = await prisma.passage.count({
      where: { textSourceId: source.id },
    });
    const witnesses = await prisma.passageWitness.count({
      where: { sourceId: source.id },
    });
    const translations = await prisma.translation.count({
      where: { OR: [{ sourceId: source.id }, { historicalWorkId: source.id }] },
    });
    if (passages || witnesses || translations) {
      throw new Error(
        `Refusing to delete ${slug}: still referenced by ${passages} passages, ${witnesses} witnesses, ${translations} translations`,
      );
    }
    await prisma.source.delete({ where: { id: source.id } });
    removed.push(slug);
  }
  return removed;
}
