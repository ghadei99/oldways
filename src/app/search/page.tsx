import Link from "next/link";
import { CanonicalRef } from "@/components/CanonicalRef";
import { searchLibrary } from "@/lib/search";
import { formatReference } from "@/lib/references";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = q ? await searchLibrary(q) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-serif text-5xl">Search</h1>
      <p className="mt-3 text-ink-soft">
        Try a canonical number such as <em>10.129</em>, a title such as{" "}
        <em>Nasadiya</em>, or a Devanagari word such as <span className="font-deva">अग्नि</span>.
      </p>
      <form className="mt-8" action="/search" method="get">
        <label htmlFor="q" className="sr-only">
          Query
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="RV 10.129.1, Nasadiya, अग्नि"
          className="w-full border border-rule bg-paper-raised px-4 py-3 text-lg"
        />
      </form>

      {results ? (
        <div className="mt-10 space-y-10">
          <Section title="Passages">
            {results.passages.map((p) => (
              <li key={p.id} className="border-b border-rule py-3">
                <CanonicalRef compact={p.canonicalReference} className="ml-0" />
                <p className="font-deva mt-2">{p.originalText}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {p.division.title} · {formatReference(p.canonicalReference)}
                </p>
              </li>
            ))}
            {results.passages.length === 0 ? <Empty /> : null}
          </Section>
          <Section title="Suktas">
            {results.suktas.map((s) => (
              <li key={s.id} className="py-2">
                <Link
                  href={`/texts/${s.corpus.slug}/${s.parent?.number}/${s.number}`}
                  className="text-indigo"
                >
                  {s.corpus.title} {s.parent?.number}.{s.number}
                  {s.title ? ` — ${s.title}` : ""}
                </Link>
              </li>
            ))}
            {results.suktas.length === 0 ? <Empty /> : null}
          </Section>
          <Section title="Stories">
            {results.stories.map((s) => (
              <li key={s.id} className="py-2">
                <Link href={`/stories/${s.slug}`} className="text-indigo">
                  {s.title}
                </Link>
              </li>
            ))}
            {results.stories.length === 0 ? <Empty /> : null}
          </Section>
          <Section title="Themes">
            {results.themes.map((t) => (
              <li key={t.id} className="py-2">
                <Link href={`/explore/themes/${t.slug}`} className="text-indigo">
                  {t.title}
                </Link>
              </li>
            ))}
            {results.themes.length === 0 ? <Empty /> : null}
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
        {title}
      </h2>
      <ul className="mt-3">{children}</ul>
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-ink-soft">No matches in this seed.</p>;
}
