import { cache } from "react";
import { prisma } from "./db";
import {
  includeDevelopmentContent,
  includeResearchSanskrit,
  sanskritSourceAllowedInCurrentMode,
  translationWhere,
} from "./content/visibility";
import { buildPassagePreview } from "./stories/passage-preview";

export const getCorpusBySlug = cache(async (slug: string) => {
  return prisma.corpus.findUnique({ where: { slug } });
});

export const getReaderTree = cache(async (corpusId: string) => {
  return prisma.textDivision.findMany({
    where: { corpusId, divisionType: "mandala" },
    orderBy: { orderIndex: "asc" },
    include: {
      children: {
        where: { divisionType: "sukta" },
        orderBy: { orderIndex: "asc" },
        include: {
          _count: { select: { passages: true } },
        },
      },
    },
  });
});

export async function getSuktaWithPassages(
  corpusSlug: string,
  mandala: string,
  sukta: string,
) {
  const corpus = await getCorpusBySlug(corpusSlug);
  if (!corpus) return null;
  const mandalaDiv = await prisma.textDivision.findFirst({
    where: {
      corpusId: corpus.id,
      parentId: null,
      divisionType: "mandala",
      number: mandala,
    },
  });
  if (!mandalaDiv) return null;
  const includeDemo = includeDevelopmentContent();

  const suktaDiv = await prisma.textDivision.findFirst({
    where: {
      corpusId: corpus.id,
      parentId: mandalaDiv.id,
      divisionType: "sukta",
      number: sukta,
    },
    include: {
      passages: {
        orderBy: { orderIndex: "asc" },
        include: {
          textSource: true,
          transliterations: true,
          translations: {
            where: translationWhere(includeDemo),
            include: { translator: true, source: true, historicalWork: true },
          },
          passageThemes: { include: { theme: true } },
          storyReferences: {
            include: { story: true },
          },
        },
      },
    },
  });
  if (!suktaDiv) return null;

  const passages = suktaDiv.passages.map((passage) => {
    const allowed = passage.textSource
      ? sanskritSourceAllowedInCurrentMode(passage.textSource)
      : false;
    if (allowed) return passage;
    return {
      ...passage,
      originalText: "",
      sourceText: null,
      transliterations: [],
    };
  });
  const withheld = passages.some((p, i) => {
    const original = suktaDiv.passages[i];
    return Boolean(original.originalText) && !p.originalText;
  });

  return {
    corpus,
    mandala: mandalaDiv,
    sukta: { ...suktaDiv, passages },
    sanskritWithheld: withheld,
    sanskritWithheldReason: withheld
      ? "The preferred Sanskrit encoding is a non-commercial research source and is not shown in this build."
      : null,
  };
}

export async function getAdjacentSuktas(
  corpusId: string,
  mandalaId: string,
  suktaNumber: number,
) {
  const prev = await prisma.textDivision.findFirst({
    where: {
      corpusId,
      parentId: mandalaId,
      divisionType: "sukta",
      orderIndex: { lt: suktaNumber },
    },
    orderBy: { orderIndex: "desc" },
  });
  const next = await prisma.textDivision.findFirst({
    where: {
      corpusId,
      parentId: mandalaId,
      divisionType: "sukta",
      orderIndex: { gt: suktaNumber },
    },
    orderBy: { orderIndex: "asc" },
  });
  return { prev, next };
}

export async function getPassagePreviews(canonicals: string[]) {
  const unique = [...new Set(canonicals.filter(Boolean))];
  if (!unique.length) return {} as Record<string, ReturnType<typeof buildPassagePreview>>;
  const includeDemo = includeDevelopmentContent();
  const passages = await prisma.passage.findMany({
    where: { canonicalReference: { in: unique } },
    include: {
      textSource: true,
      transliterations: true,
      translations: {
        where: translationWhere(includeDemo),
        include: { translator: true },
      },
    },
  });
  const includeSanskrit = includeResearchSanskrit();
  return Object.fromEntries(
    passages.map((passage) => [
      passage.canonicalReference,
      buildPassagePreview(
        {
          canonicalReference: passage.canonicalReference,
          originalText: passage.originalText,
          sourceText: passage.sourceText,
          iast:
            passage.transliterations.find((t) => t.scheme === "IAST")?.text ??
            passage.sourceText,
          textSource: passage.textSource,
          translations: passage.translations.map((t) => ({
            language: t.language,
            text: t.text,
            isDemo: t.isDemo,
            visibility: t.visibility,
            status: t.status,
            translatorName: t.translator?.name ?? null,
          })),
        },
        { includeSanskrit, includeDevelopment: includeDemo },
      ),
    ]),
  );
}
