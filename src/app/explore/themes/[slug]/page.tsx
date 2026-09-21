import Link from "next/link";
import { notFound } from "next/navigation";
import { CanonicalRef } from "@/components/CanonicalRef";
import { prisma } from "@/lib/db";
import { suktaHref } from "@/lib/references";

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = await prisma.theme.findUnique({
    where: { slug },
    include: {
      stories: { include: { story: true } },
      passages: {
        include: {
          passage: {
            include: {
              division: { include: { parent: true, corpus: true } },
            },
          },
        },
      },
    },
  });
  if (!theme) notFound();

  const suktas = new Map<
    string,
    { title: string | null; href: string; refs: string[] }
  >();
  for (const { passage } of theme.passages) {
    const mandala = passage.division.parent?.number;
    const sukta = passage.division.number;
    if (!mandala) continue;
    const key = `${mandala}.${sukta}`;
    const href = suktaHref(passage.division.corpus?.slug ?? "rigveda", mandala, sukta);
    const existing = suktas.get(key);
    if (existing) existing.refs.push(passage.canonicalReference);
    else {
      suktas.set(key, {
        title: passage.division.title,
        href,
        refs: [passage.canonicalReference],
      });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
        Theme
      </p>
      <h1 className="mt-2 font-serif text-5xl">{theme.title}</h1>
      <p className="scripture mt-4 text-lg text-ink-soft">{theme.description}</p>

      <section className="mt-12">
        <h2 className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
          Primary suktas
        </h2>
        <div className="mt-5 grid gap-4">
          {[...suktas.entries()].map(([key, item]) => (
            <article key={key} className="border border-rule bg-paper-raised p-5">
              <h3 className="font-serif text-2xl">
                <Link href={item.href}>
                  Rigveda {key}
                  {item.title ? ` — ${item.title}` : ""}
                </Link>
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.refs.slice(0, 8).map((ref) => (
                  <CanonicalRef key={ref} compact={ref} className="ml-0" />
                ))}
              </div>
            </article>
          ))}
          {suktas.size === 0 ? (
            <p className="text-ink-soft">No seeded passages for this theme yet.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
          Stories
        </h2>
        <ul className="mt-4 space-y-2">
          {theme.stories.map(({ story }) => (
            <li key={story.id}>
              <Link href={`/stories/${story.slug}`} className="text-indigo">
                {story.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
