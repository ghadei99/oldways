import { prisma } from "@/lib/db";
import { isObsoleteSourceSlug, VISIBILITY } from "@/lib/content/visibility";

export default async function SourcesPage() {
  const sources = (
    await prisma.source.findMany({
      orderBy: { title: "asc" },
      include: { corpus: true },
    })
  ).filter(
    (s) => s.visibility !== VISIBILITY.HIDDEN && !isObsoleteSourceSlug(s.slug),
  );

  const sanskrit = sources.filter(
    (s) => s.kind === "digital_corpus" || s.kind === "edition",
  );
  const translations = sources.filter(
    (s) => s.kind === "historical_work" || s.kind === "digital_transcription" || s.kind === "translation",
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
        Provenance
      </p>
      <h1 className="mt-2 font-serif text-5xl">Sources</h1>
      <p className="scripture mt-4 text-lg leading-8 text-ink-soft">
        Where the displayed text comes from, which edition it represents, and
        whether it can be used commercially. Development material is labelled as
        such.
      </p>

      <section className="mt-12">
        <h2 className="font-serif text-3xl">Rigveda Sanskrit</h2>
        <ul className="mt-6 space-y-6">
          {sanskrit.map((source) => (
            <li key={source.id} className="border border-rule bg-paper-raised p-6">
              <h3 className="font-serif text-2xl">{source.title}</h3>
              <p className="mt-1 text-sm uppercase tracking-[0.16em] text-ink-soft">
                {source.kind.replaceAll("_", " ")}
                {source.visibility === VISIBILITY.DEVELOPMENT
                  ? " · development / research"
                  : ""}
              </p>
              <dl className="mt-4 grid gap-2 text-sm">
                {source.digitalProject ? (
                  <Row label="Digital project" value={source.digitalProject} />
                ) : null}
                {source.edition ? <Row label="Edition" value={source.edition} /> : null}
                {source.editor ? <Row label="Editor / encoding" value={source.editor} /> : null}
                {source.licence ? <Row label="Licence" value={source.licence} /> : null}
                <Row
                  label="Commercial use"
                  value={source.commercialUseAllowed ? "Allowed" : "Not allowed"}
                />
                <Row label="Status" value={source.visibility.toLowerCase()} />
                {source.copyrightStatus ? (
                  <Row
                    label="Copyright status"
                    value={source.copyrightStatus.replaceAll("_", " ")}
                  />
                ) : null}
                {source.url ? (
                  <Row
                    label="Source"
                    value={
                      <a href={source.url} className="text-indigo break-all">
                        {source.url}
                      </a>
                    }
                  />
                ) : null}
                {source.attributionText ? (
                  <Row label="Attribution" value={source.attributionText} />
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-3xl">Translations</h2>
        <ul className="mt-6 space-y-6">
          {translations.map((source) => (
            <li key={source.id} className="border border-rule bg-paper-raised p-6">
              <h3 className="font-serif text-2xl">{source.title}</h3>
              <p className="mt-1 text-sm uppercase tracking-[0.16em] text-ink-soft">
                {source.kind.replaceAll("_", " ")}
                {source.visibility === VISIBILITY.DEVELOPMENT
                  ? " · development only"
                  : ""}
              </p>
              <dl className="mt-4 grid gap-2 text-sm">
                {source.translatorName ? (
                  <Row label="Translator" value={source.translatorName} />
                ) : null}
                <Row label="Work" value={source.title} />
                {source.year ? <Row label="Year" value={String(source.year)} /> : null}
                {source.edition ? <Row label="Edition" value={source.edition} /> : null}
                {source.digitalProject ? (
                  <Row label="Digital source" value={source.digitalProject} />
                ) : (
                  <Row
                    label="Digital source"
                    value={
                      source.kind === "historical_work"
                        ? "Not a digital transcription"
                        : source.url ?? "—"
                    }
                  />
                )}
                {source.licence ? (
                  <Row label="Licence / status" value={source.licence} />
                ) : null}
                <Row
                  label="Commercial use"
                  value={source.commercialUseAllowed ? "Allowed" : "Not allowed"}
                />
                <Row label="Status" value={source.visibility.toLowerCase()} />
                {source.attributionText ? (
                  <Row label="Attribution" value={source.attributionText} />
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </dt>
      <dd className="mt-1 leading-6">{value}</dd>
    </div>
  );
}
