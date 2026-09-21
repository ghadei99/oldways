import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
        About
      </p>
      <h1 className="mt-2 font-serif text-5xl">Read the text. Keep the layers apart.</h1>
      <div className="scripture mt-8 space-y-5 text-lg leading-8 text-ink-soft">
        <p>
          The Vedic Library is a structured digital library of ancient religious
          and philosophical texts, beginning with the Rigveda. Source text,
          translation, editorial narrative, scholarly comment, and later tradition
          are kept distinct.
        </p>
        <p>
          Each mantra has a permanent canonical ID such as RV.10.129.1. Stories
          never copy scripture; they point at those IDs. The current Sanskrit
          encoding is the GRETIL digital Ṛgveda (Aufrecht 1877), licensed CC
          BY-NC-SA 4.0. That digital file is a development and research source,
          not a commercial-safe corpus.
        </p>
        <p>
          English, where present, is Ralph T. H. Griffith’s 1896 <em>Hymns of
          the Rigveda</em>, a public-domain historical translation, from a
          Wikisource transcription of that work. Hindi, Odia, and Bengali
          renderings in this project are working development texts, not verified
          published translations, and are not shown as such in production.
        </p>
        <p>
          See{" "}
          <Link href="/sources" className="text-indigo">
            Sources
          </Link>{" "}
          for edition, licence, and commercial-use status.
        </p>
      </div>
    </div>
  );
}
