import Link from "next/link";
import { prisma } from "@/lib/db";
import { CanonicalRef } from "@/components/CanonicalRef";

const THEMES = [
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

const FEATURED = [
  {
    title: "Nāsadīya Sūkta",
    href: "/texts/rigveda/10/129",
    story: "/stories/nasadiya-sukta",
    ref: "RV.10.129.1",
    blurb: "Neither non-being nor being, and a question left open.",
  },
  {
    title: "Yama and Yamī",
    href: "/texts/rigveda/10/10",
    story: "/stories/yama-and-yami",
    ref: "RV.10.10.3",
    blurb: "A dialogue on desire, kinship, and the watching gods.",
  },
  {
    title: "Purūravas and Urvaśī",
    href: "/texts/rigveda/10/95",
    story: "/stories/pururavas-and-urvashi",
    ref: "RV.10.95.1",
    blurb: "A mortal calls after an Apsaras at the edge of morning.",
  },
  {
    title: "Sarama and the Paṇis",
    href: "/texts/rigveda/10/108",
    story: "/stories/sarama-and-the-panis",
    ref: "RV.10.108.1",
    blurb: "A messenger demands the hidden cows; the Paṇis refuse.",
  },
  {
    title: "Viśvāmitra and the Rivers",
    href: "/texts/rigveda/3/33",
    story: "/stories/visvamitra-and-the-rivers",
    ref: "RV.3.33.1",
    blurb: "Two rivers come down from the mountains and are asked to yield.",
  },
  {
    title: "Puruṣa Sūkta",
    href: "/texts/rigveda/10/90",
    story: "/stories/purusha-sukta",
    ref: "RV.10.90.1",
    blurb: "A cosmic person is offered; the world is named from the parts.",
  },
];

export default async function HomePage() {
  const themes = await prisma.theme.findMany();
  const themeMap = Object.fromEntries(themes.map((t) => [t.slug, t]));

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-16 md:px-6 md:pt-24">
        <p className="text-[0.7rem] uppercase tracking-[0.32em] text-copper">
          A source-traceable library
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
          The Vedic Library
        </h1>
        <p className="scripture mt-6 max-w-2xl text-xl leading-9 text-ink-soft md:text-2xl">
          Explore the oldest surviving layers of Indian thought through the texts
          themselves.
        </p>
        <p className="mt-4 max-w-xl text-sm uppercase tracking-[0.18em] text-ink-soft">
          Read ancient texts. Follow the source.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/texts/rigveda/10/129"
            className="border border-indigo bg-indigo px-5 py-2.5 text-sm tracking-wide text-paper-raised"
          >
            Read the Rigveda
          </Link>
          <Link
            href="/stories"
            className="border border-rule px-5 py-2.5 text-sm tracking-wide text-ink hover:border-indigo"
          >
            Explore stories
          </Link>
        </div>
      </section>

      <div className="folio-rule mx-auto max-w-6xl" />

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <h2 className="text-[0.7rem] uppercase tracking-[0.28em] text-ink-soft">
          Featured passages
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {FEATURED.map((item) => (
            <article
              key={item.title}
              className="border border-rule bg-paper-raised p-6"
            >
              <h3 className="font-serif text-2xl">{item.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{item.blurb}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <CanonicalRef compact={item.ref} className="ml-0" />
                <Link href={item.href} className="text-sm text-indigo">
                  Open sukta
                </Link>
          <Link href={item.story} className="text-sm text-indigo">
            Read story →
          </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <h2 className="text-[0.7rem] uppercase tracking-[0.28em] text-ink-soft">
          Explore by theme
        </h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {THEMES.map((slug) => {
            const theme = themeMap[slug];
            return (
              <li key={slug}>
                <Link
                  href={`/explore/themes/${slug}`}
                  className="block border border-rule px-4 py-4 hover:border-indigo/40"
                >
                  <span className="font-serif text-lg">
                    {theme?.title ?? slug}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center md:px-6">
        <div className="folio-rule mb-10" />
        <h2 className="font-serif text-3xl">Every story returns to the source.</h2>
        <p className="scripture mx-auto mt-4 max-w-xl text-lg leading-8 text-ink-soft">
          Stories, themes, and notes point to permanent canonical IDs such as{" "}
          <span className="text-ink">RV.10.129.1</span> — Rigveda, maṇḍala 10,
          sukta 129, mantra 1. They do not copy the verse. Click a reference
          and the reader opens on that mantra.
        </p>
      </section>
    </div>
  );
}
