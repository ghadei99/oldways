import { CanonicalRef } from "@/components/CanonicalRef";
import { prisma } from "@/lib/db";
import { parseStoryBody } from "@/lib/story-body";
import Link from "next/link";

const THEME_ORDER = [
  "creation",
  "cosmos",
  "death",
  "ritual",
  "gods",
  "women",
  "kingship",
  "war",
  "nature",
  "philosophy",
  "society",
];

const FEATURED_HYMNS = [
  { href: "/texts/rigveda/10/129", title: "Nāsadīya Sūkta", ref: "RV.10.129.1" },
  { href: "/texts/rigveda/10/90", title: "Puruṣa Sūkta", ref: "RV.10.90.1" },
  { href: "/texts/rigveda/10/121", title: "Hiraṇyagarbha", ref: "RV.10.121.1" },
  { href: "/texts/rigveda/1/32", title: "Indra and Vṛtra", ref: "RV.1.32.1" },
  { href: "/texts/rigveda/10/85", title: "The marriage hymn", ref: "RV.10.85.36" },
  { href: "/texts/rigveda/10/14", title: "The funeral hymn", ref: "RV.10.14.1" },
];

export default async function ExplorePage() {
  const themes = await prisma.theme.findMany({
    include: {
      _count: { select: { passages: true, stories: true } },
    },
  });
  const themeMap = Object.fromEntries(themes.map((t) => [t.slug, t]));
  const stories = await prisma.story.findMany({
    orderBy: { title: "asc" },
    include: {
      references: {
        where: { referenceType: "citation" },
        include: { passage: true },
        take: 3,
      },
    },
  });
  const dialogues = stories.filter(
    (story) => parseStoryBody(story.body).kind === "Dialogue",
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
        Discover
      </p>
      <h1 className="mt-2 font-serif text-5xl">Explore</h1>
      <p className="scripture mt-4 max-w-2xl text-lg text-ink-soft">
        Start from a theme, a dialogue hymn, or a story that returns to a
        canonical passage. Stories are editorial; the hymn is the source.
      </p>

      <section className="mt-12">
        <h2 className="text-[0.7rem] uppercase tracking-[0.28em] text-ink-soft">
          Explore by theme
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {THEME_ORDER.map((slug) => {
            const theme = themeMap[slug];
            if (!theme) return null;
            return (
              <li key={theme.id}>
                <Link
                  href={`/explore/themes/${theme.slug}`}
                  className="block border border-rule bg-paper-raised p-5 hover:border-indigo/40"
                >
                  <h3 className="font-serif text-2xl">{theme.title}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{theme.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-soft">
                    {theme._count.passages} passages · {theme._count.stories} stories
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-[0.7rem] uppercase tracking-[0.28em] text-ink-soft">
          Featured dialogues
        </h2>
        <ul className="mt-5 space-y-3">
          {dialogues.map((story) => (
            <li key={story.id} className="border border-rule p-4">
              <Link href={`/stories/${story.slug}`} className="font-serif text-xl">
                {story.title}
              </Link>
              <p className="mt-1 text-sm text-ink-soft">{story.subtitle}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-[0.7rem] uppercase tracking-[0.28em] text-ink-soft">
          Featured hymns
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {FEATURED_HYMNS.map((hymn) => (
            <li key={hymn.href} className="border border-rule p-4">
              <Link href={hymn.href} className="font-serif text-xl">
                {hymn.title}
              </Link>
              <div className="mt-2">
                <CanonicalRef compact={hymn.ref} className="ml-0" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-[0.7rem] uppercase tracking-[0.28em] text-ink-soft">
          Stories with primary-source links
        </h2>
        <ul className="mt-5 space-y-4">
          {stories.map((story) => (
            <li key={story.id}>
              <Link href={`/stories/${story.slug}`} className="text-indigo">
                {story.title}
              </Link>
              <span className="mx-2 text-ink-soft">→</span>
              {story.references[0] ? (
                <CanonicalRef
                  compact={story.references[0].passage.canonicalReference}
                  className="ml-0"
                />
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
