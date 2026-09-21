import Link from "next/link";
import { notFound } from "next/navigation";
import { ReaderView, type ReaderPayload } from "@/components/reader/ReaderView";
import { prisma } from "@/lib/db";
import { getSuktaMeta } from "@/lib/editorial/sukta-meta";
import {
  getAdjacentSuktas,
  getCorpusBySlug,
  getReaderTree,
  getSuktaWithPassages,
} from "@/lib/queries";

type Props = {
  params: Promise<{ corpus: string; parts?: string[] }>;
};

export default async function TextsPage({ params }: Props) {
  const { corpus: corpusSlug, parts = [] } = await params;
  const corpus = await getCorpusBySlug(corpusSlug);
  if (!corpus) notFound();

  if (parts.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
          Corpus
        </p>
        <h1 className="mt-2 font-serif text-5xl">{corpus.title}</h1>
        {corpus.originalTitle ? (
          <p className="font-deva mt-3 text-2xl text-ink-soft">
            {corpus.originalTitle}
          </p>
        ) : null}
        <p className="scripture mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
          {corpus.description}
        </p>
        <ul className="mt-10 divide-y divide-rule border-y border-rule">
          {(
            await prisma.textDivision.findMany({
              where: { corpusId: corpus.id, divisionType: "mandala" },
              orderBy: { orderIndex: "asc" },
              include: { _count: { select: { children: true } } },
            })
          ).map((mandala) => (
            <li key={mandala.id}>
              <Link
                href={`/texts/${corpus.slug}/${mandala.number}`}
                className="flex items-baseline justify-between gap-4 py-4"
              >
                <span className="font-serif text-xl">
                  Maṇḍala {mandala.number}
                </span>
                <span className="text-sm text-ink-soft">
                  {mandala._count.children} suktas
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (parts.length === 1) {
    const mandala = await prisma.textDivision.findFirst({
      where: {
        corpusId: corpus.id,
        divisionType: "mandala",
        number: parts[0],
      },
      include: {
        children: {
          where: { divisionType: "sukta" },
          orderBy: { orderIndex: "asc" },
          include: { _count: { select: { passages: true } } },
        },
      },
    });
    if (!mandala) notFound();
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
          {corpus.title}
        </p>
        <h1 className="mt-2 font-serif text-5xl">Maṇḍala {mandala.number}</h1>
        {mandala.children.length === 0 ? (
          <p className="mt-6 text-ink-soft">
            No suktas from this maṇḍala are in the development seed yet.
          </p>
        ) : (
          <ul className="mt-10 divide-y divide-rule border-y border-rule">
            {mandala.children.map((sukta) => (
              <li key={sukta.id}>
                <Link
                  href={`/texts/${corpus.slug}/${mandala.number}/${sukta.number}`}
                  className="flex items-baseline justify-between py-4"
                >
                  <span className="font-serif text-xl">
                    Sukta {sukta.number}
                    {sukta.title ? ` — ${sukta.title}` : ""}
                  </span>
                  <span className="text-sm text-ink-soft">
                    {sukta._count.passages} mantras
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const packed = await getSuktaWithPassages(corpusSlug, parts[0], parts[1]);
  if (!packed || packed.sukta.passages.length === 0) notFound();
  const suktaMeta = getSuktaMeta(packed.mandala.number, packed.sukta.number);

  const hymnStories = [
    ...new Map(
      packed.sukta.passages.flatMap((p) =>
        p.storyReferences.map((sr) => [
          sr.story.slug,
          { slug: sr.story.slug, title: sr.story.title },
        ]),
      ),
    ).values(),
  ];

  const tree = await getReaderTree(corpus.id);
  const adjacent = await getAdjacentSuktas(
    corpus.id,
    packed.mandala.id,
    packed.sukta.orderIndex,
  );

  const payload: ReaderPayload = {
    corpusSlug: corpus.slug,
    corpusTitle: corpus.title,
    mandalaNumber: packed.mandala.number,
    suktaNumber: packed.sukta.number,
    suktaTitle: packed.sukta.title,
    suktaKind: suktaMeta?.kind ?? null,
    suktaContext: suktaMeta?.context ?? null,
    hymnStories,
    highlight: parts[2] ?? null,
    sanskritWithheld: packed.sanskritWithheld,
    sanskritWithheldReason: packed.sanskritWithheldReason,
    prevHref: adjacent.prev
      ? `/texts/${corpus.slug}/${packed.mandala.number}/${adjacent.prev.number}`
      : null,
    nextHref: adjacent.next
      ? `/texts/${corpus.slug}/${packed.mandala.number}/${adjacent.next.number}`
      : null,
    tree: tree.map((m) => ({
      number: m.number,
      title: m.title,
      suktas: m.children.map((s) => ({
        number: s.number,
        title: s.title,
        passageCount: s._count.passages,
      })),
    })),
    passages: packed.sukta.passages.map((p) => ({
      id: p.id,
      canonicalReference: p.canonicalReference,
      orderIndex: p.orderIndex,
      originalText: p.originalText,
      iast: p.transliterations.find((t) => t.scheme === "IAST")?.text ?? null,
      translations: p.translations.map((t) => ({
        id: t.id,
        language: t.language,
        text: t.text,
        isDemo: t.isDemo,
        notes: t.notes,
        translator: t.translator
          ? {
              id: t.translator.id,
              name: t.translator.name,
              isHistorical: t.translator.isHistorical,
            }
          : null,
        source: t.source
          ? {
              id: t.source.id,
              title: t.source.title,
              year: t.source.year,
              edition: t.source.edition,
              licence: t.source.licence,
              copyrightStatus: t.source.copyrightStatus,
              attributionText: t.source.attributionText,
              url: t.source.url,
              translatorName: t.source.translatorName,
              digitalProject: t.source.digitalProject,
              commercialUseAllowed: t.source.commercialUseAllowed,
              kind: t.source.kind,
            }
          : null,
        historicalWork: t.historicalWork
          ? {
              id: t.historicalWork.id,
              title: t.historicalWork.title,
              year: t.historicalWork.year,
              edition: t.historicalWork.edition,
              licence: t.historicalWork.licence,
              copyrightStatus: t.historicalWork.copyrightStatus,
              attributionText: t.historicalWork.attributionText,
              url: t.historicalWork.url,
              translatorName: t.historicalWork.translatorName,
              digitalProject: t.historicalWork.digitalProject,
              commercialUseAllowed: t.historicalWork.commercialUseAllowed,
              kind: t.historicalWork.kind,
            }
          : null,
        status: t.status,
        visibility: t.visibility,
        workTitle: t.workTitle,
        publicationYear: t.publicationYear,
        edition: t.edition,
        copyrightStatus: t.copyrightStatus,
        attribution: t.attribution,
      })),
      themes: p.passageThemes.map((pt) => pt.theme),
      stories: [
        ...new Map(
          p.storyReferences.map((sr) => [
            sr.story.slug,
            { slug: sr.story.slug, title: sr.story.title },
          ]),
        ).values(),
      ],
      textSource: p.textSource
        ? {
            id: p.textSource.id,
            title: p.textSource.title,
            year: p.textSource.year,
            edition: p.textSource.edition,
            licence: p.textSource.licence,
            copyrightStatus: p.textSource.copyrightStatus,
            attributionText: p.textSource.attributionText,
            url: p.textSource.url,
            translatorName: p.textSource.translatorName,
            digitalProject: p.textSource.digitalProject,
            commercialUseAllowed: p.textSource.commercialUseAllowed,
            kind: p.textSource.kind,
          }
        : null,
    })),
  };

  return <ReaderView data={payload} />;
}
