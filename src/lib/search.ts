import { prisma } from "./db";
import { parseCanonicalReference } from "./references";
import {
  includeDevelopmentContent,
  includeResearchSanskrit,
  translationWhere,
} from "./content/visibility";
import { foldSearchText, matchesFolded, searchNeedles } from "./search-normalize";
import { parseStoryBody } from "./story-body";

export async function searchLibrary(query: string) {
  const q = query.trim();
  if (!q) return { passages: [], stories: [], themes: [], suktas: [] };

  const translationFilter = translationWhere(includeDevelopmentContent());
  const allowSanskritBody = includeResearchSanskrit();
  const parsed = parseCanonicalReference(q);
  const needles = searchNeedles(q);

  const passages = parsed
    ? await prisma.passage.findMany({
        where: {
          canonicalReference: {
            startsWith:
              parsed.parts.length === 3
                ? parsed.compact
                : `RV.${parsed.parts.join(".")}`,
          },
        },
        include: {
          division: { include: { parent: true } },
          translations: {
            where: translationFilter,
            include: { translator: true },
          },
        },
        take: 20,
      })
    : await prisma.passage.findMany({
        where: {
          OR: [
            ...(allowSanskritBody
              ? [
                  { originalText: { contains: q } },
                  { normalizedText: { contains: q } },
                  { transliterations: { some: { text: { contains: q } } } },
                ]
              : []),
            { canonicalReference: { contains: q.replace(/\s+/g, ".") } },
            { translations: { some: { text: { contains: q }, ...translationFilter } } },
            { division: { title: { contains: q } } },
          ],
        },
        include: {
          division: { include: { parent: true } },
          translations: {
            where: translationFilter,
            include: { translator: true },
          },
        },
        take: 20,
      });

  const allStories = await prisma.story.findMany();
  const refStoryIds = parsed
    ? (
        await prisma.storyReference.findMany({
          where: {
            passage: {
              canonicalReference: {
                startsWith:
                  parsed.parts.length === 3
                    ? parsed.compact
                    : `RV.${parsed.parts.join(".")}`,
              },
            },
          },
          select: { storyId: true },
        })
      ).map((row) => row.storyId)
    : [];

  const stories = allStories
    .filter((story) => {
      if (refStoryIds.includes(story.id)) return true;
      const body = parseStoryBody(story.body);
      const hay = [
        story.title,
        story.subtitle ?? "",
        story.summary,
        body.primarySourceLabel ?? "",
        body.kind ?? "",
        story.slug.replaceAll("-", " "),
      ].join(" ");
      return matchesFolded(hay, needles);
    })
    .slice(0, 10);

  const allThemes = await prisma.theme.findMany();
  const themes = allThemes
    .filter((theme) => matchesFolded(`${theme.title} ${theme.slug} ${theme.description ?? ""}`, needles))
    .slice(0, 10);

  const titledSuktas = await prisma.textDivision.findMany({
    where: { divisionType: "sukta" },
    include: { parent: true, corpus: true },
  });
  const suktas = titledSuktas
    .filter((sukta) => {
      if (parsed) {
        return (
          sukta.parent?.number === parsed.mandala &&
          sukta.number === parsed.sukta
        );
      }
      const hay = `${sukta.title ?? ""} ${sukta.parent?.number}.${sukta.number}`;
      return matchesFolded(hay, needles) || sukta.number === q;
    })
    .slice(0, 10);

  return { passages, stories, themes, suktas };
}

export { foldSearchText };
