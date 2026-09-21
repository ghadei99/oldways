import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatReference, passageHref } from "@/lib/references";

const CHECKS = ["RV.1.1.1", "RV.10.10.1", "RV.10.90.1", "RV.10.129.1"];

export default async function CorpusDevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const corpus = await prisma.corpus.findUnique({
    where: { slug: "rigveda" },
    include: {
      sources: true,
      importRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      _count: { select: { passages: true } },
    },
  });
  if (!corpus) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-4xl">Corpus</h1>
        <p className="mt-4">No Rigveda corpus in the database. Run the importer.</p>
      </div>
    );
  }

  const mandalas = await prisma.textDivision.count({
    where: { corpusId: corpus.id, divisionType: "mandala" },
  });
  const suktas = await prisma.textDivision.count({
    where: { corpusId: corpus.id, divisionType: "sukta" },
  });
  const last = corpus.importRuns[0];
  const stats = last ? (JSON.parse(last.statsJson) as { status?: string }) : null;
  const textSource =
    corpus.sources.find((s) => s.slug === "gretil-aufrecht-2019") ??
    corpus.sources.find((s) => s.kind === "digital_corpus");

  const checks = await Promise.all(
    CHECKS.map(async (ref) => {
      const passage = await prisma.passage.findUnique({
        where: { canonicalReference: ref },
      });
      return { ref, ok: Boolean(passage) };
    }),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
        Development
      </p>
      <h1 className="mt-2 font-serif text-5xl">{corpus.title}</h1>
      <dl className="mt-8 grid gap-4 text-sm">
        <div>
          <dt className="uppercase tracking-[0.16em] text-ink-soft">Mandalas</dt>
          <dd className="font-serif text-3xl">{mandalas}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.16em] text-ink-soft">Suktas</dt>
          <dd className="font-serif text-3xl">{suktas}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.16em] text-ink-soft">Mantras</dt>
          <dd className="font-serif text-3xl">{corpus._count.passages}</dd>
        </div>
      </dl>
      <p className="mt-8 text-sm leading-7">
        Source: {textSource?.title ?? "—"}
        <br />
        Licence: {textSource?.licence ?? "—"}
        <br />
        Last import: {last?.finishedAt?.toISOString() ?? "never"}
        <br />
        Validation: {stats?.status ?? last?.status ?? "unknown"}
      </p>
      <ul className="mt-8 space-y-2">
        {checks.map((item) => (
          <li key={item.ref}>
            {item.ok ? (
              <Link href={passageHref(item.ref)} className="text-indigo">
                {formatReference(item.ref)} · resolves
              </Link>
            ) : (
              <span>
                {formatReference(item.ref)} · missing
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
