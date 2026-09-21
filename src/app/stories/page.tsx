import { CanonicalRef } from "@/components/CanonicalRef";
import { prisma } from "@/lib/db";
import { parseStoryBody, STORY_KINDS, type StoryKind } from "@/lib/story-body";
import Link from "next/link";

export default async function StoriesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; kind?: string; hymn?: string }>;
}) {
  const { theme, kind, hymn } = await searchParams;
  const stories = await prisma.story.findMany({
    orderBy: { title: "asc" },
    include: {
      themes: { include: { theme: true } },
      references: {
        include: { passage: true },
        take: 12,
      },
    },
  });
  const themes = await prisma.theme.findMany({ orderBy: { title: "asc" } });
  const hymnNeedle = hymn?.trim().replace(/\s+/g, ".") ?? "";

  const filtered = stories.filter((story) => {
    const body = parseStoryBody(story.body);
    if (kind && body.kind !== kind) return false;
    if (theme && !story.themes.some((t) => t.theme.slug === theme)) return false;
    if (hymnNeedle) {
      const hay = [
        body.primarySourceLabel ?? "",
        ...story.references.map((r) => r.passage.canonicalReference),
      ]
        .join(" ")
        .replaceAll(" ", ".");
      if (!hay.includes(hymnNeedle.replace(/^RV\.?/i, "RV."))) {
        const compact = hymnNeedle.replace(/^RV\.?/i, "");
        if (!hay.includes(compact)) return false;
      }
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
        Editorial narrative
      </p>
      <h1 className="mt-2 font-serif text-5xl">Stories</h1>
      <p className="scripture mt-4 max-w-2xl text-lg leading-8 text-ink-soft">
        Stories help a reader follow a difficult hymn. They are not the hymn.
        Every claim that belongs to the Rigveda is marked with a canonical
        reference. Later tradition is labelled as such.
      </p>

      <form className="mt-8 grid gap-3 border border-rule bg-paper-raised p-4 sm:grid-cols-3" method="get">
        <label className="text-sm">
          <span className="block text-[0.65rem] uppercase tracking-[0.16em] text-ink-soft">
            Theme
          </span>
          <select name="theme" defaultValue={theme ?? ""} className="mt-1 w-full border border-rule bg-paper px-2 py-2">
            <option value="">All themes</option>
            {themes.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-[0.65rem] uppercase tracking-[0.16em] text-ink-soft">
            Type
          </span>
          <select name="kind" defaultValue={kind ?? ""} className="mt-1 w-full border border-rule bg-paper px-2 py-2">
            <option value="">All types</option>
            {STORY_KINDS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-[0.65rem] uppercase tracking-[0.16em] text-ink-soft">
            Hymn / reference
          </span>
          <input
            name="hymn"
            defaultValue={hymn ?? ""}
            placeholder="10.10 or RV 10.129"
            className="mt-1 w-full border border-rule bg-paper px-2 py-2"
          />
        </label>
        <div className="sm:col-span-3">
          <button
            type="submit"
            className="border border-indigo bg-indigo px-4 py-2 text-sm text-paper-raised"
          >
            Filter
          </button>
          {theme || kind || hymn ? (
            <Link href="/stories" className="ml-4 text-sm text-indigo">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <ul className="mt-10 space-y-5">
        {filtered.map((story) => {
          const body = parseStoryBody(story.body);
          const storyKind = (body.kind ?? "Story") as StoryKind | "Story";
          const uniqueReferences = [
            ...new Map(
              story.references.map((reference) => [
                reference.passage.canonicalReference,
                reference,
              ]),
            ).values(),
          ];
          return (
            <li key={story.id} className="border border-rule bg-paper-raised p-6">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
                {storyKind}
                {body.primarySourceLabel ? ` · ${body.primarySourceLabel}` : ""}
              </p>
              <h2 className="mt-1 font-serif text-2xl">
                <Link href={`/stories/${story.slug}`}>{story.title}</Link>
              </h2>
              {story.subtitle ? (
                <p className="mt-1 text-ink-soft">{story.subtitle}</p>
              ) : null}
              <p className="mt-3 text-sm leading-6">{story.summary}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-ink-soft">
                {story.themes.map((t) => t.theme.title).join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {uniqueReferences.slice(0, 4).map((ref) => (
                  <CanonicalRef
                    key={ref.id}
                    compact={ref.passage.canonicalReference}
                    className="ml-0"
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 ? (
        <p className="mt-8 text-ink-soft">No stories match those filters.</p>
      ) : null}
    </div>
  );
}
