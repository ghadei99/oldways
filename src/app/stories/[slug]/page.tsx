import { notFound } from "next/navigation";
import { StoryArticle } from "@/components/stories/StoryArticle";
import { prisma } from "@/lib/db";
import { getPassagePreviews } from "@/lib/queries";
import { collectStoryRefs, parseStoryBody } from "@/lib/story-body";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await prisma.story.findUnique({
    where: { slug },
    include: {
      themes: { include: { theme: true } },
      figures: { include: { figure: true } },
      references: {
        orderBy: { orderIndex: "asc" },
        include: {
          passage: {
            include: { division: { include: { parent: true } } },
          },
        },
      },
    },
  });
  if (!story) notFound();

  const body = parseStoryBody(story.body);
  const relatedSlugs = body.relatedStorySlugs ?? [];
  const related = relatedSlugs.length
    ? await prisma.story.findMany({
        where: { slug: { in: relatedSlugs } },
        select: { slug: true, title: true, summary: true },
      })
    : await prisma.story.findMany({
        where: {
          id: { not: story.id },
          themes: {
            some: { themeId: { in: story.themes.map((t) => t.themeId) } },
          },
        },
        select: { slug: true, title: true, summary: true },
        take: 4,
      });

  const previews = await getPassagePreviews([
    ...collectStoryRefs(body),
    ...story.references.map((r) => r.passage.canonicalReference),
  ]);

  return <StoryArticle story={story} related={related} previews={previews} />;
}
