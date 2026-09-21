import { prisma } from "@/lib/db";
import { isObsoleteSourceSlug, VISIBILITY } from "@/lib/content/visibility";

const GROUPS = [
  { key: "sanskrit", title: "Sanskrit" },
  { key: "en", title: "English" },
  { key: "hi", title: "Hindi · हिन्दी" },
  { key: "or", title: "Odia · ଓଡ଼ିଆ" },
  { key: "bn", title: "Bengali · বাংলা" },
] as const;

export default async function SourcesPage() {
  const sources = (
    await prisma.source.findMany({
      orderBy: { title: "asc" },
      include: {
        corpus: true,
        translations: { select: { language: true, status: true } },
        historicalTranslations: { select: { language: true, status: true } },
      },
    })
  ).filter(
    (source) =>
      source.visibility !== VISIBILITY.HIDDEN &&
      !isObsoleteSourceSlug(source.slug),
  );

  const grouped = Object.fromEntries(
    GROUPS.map(({ key }) => [
      key,
      sources.filter((source) => {
        if (key === "sanskrit") {
          return source.kind === "digital_corpus" || source.kind === "edition";
        }
        const languages = new Set([
          ...source.translations.map((row) => row.language),
          ...source.historicalTranslations.map((row) => row.language),
        ]);
        return languages.has(key);
      }),
    ]),
  ) as Record<(typeof GROUPS)[number]["key"], typeof sources>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
        Provenance
      </p>
      <h1 className="mt-2 font-serif text-5xl">Sources</h1>
      <p className="scripture mt-4 text-lg leading-8 text-ink-soft">
        Every text layer is listed by language, with ownership, method, and
        review status kept distinct. Machine-assisted editorial renderings are
        never presented as historical published translations.
      </p>

      {GROUPS.map(({ key, title }) => (
        <section className="mt-12" key={key}>
          <h2 className="font-serif text-3xl">{title}</h2>
          {grouped[key].length ? (
            <ul className="mt-6 space-y-6">
              {grouped[key].map((source) => {
                const rows = [
                  ...source.translations,
                  ...source.historicalTranslations,
                ].filter((row) => key === "sanskrit" || row.language === key);
                const statuses = [...new Set(rows.map((row) => row.status))];
                return (
                  <li key={source.id} className="border border-rule bg-paper-raised p-6">
                    <h3 className="font-serif text-2xl">{source.title}</h3>
                    <p className="mt-1 text-sm uppercase tracking-[0.16em] text-ink-soft">
                      {source.kind.replaceAll("_", " ")}
                      {source.visibility === VISIBILITY.DEVELOPMENT
                        ? " · development / research"
                        : " · production"}
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm">
                      {source.translatorName ? <Row label="Translator" value={source.translatorName} /> : null}
                      {source.editor ? <Row label="Editor / encoding" value={source.editor} /> : null}
                      {source.digitalProject ? <Row label="Digital project" value={source.digitalProject} /> : null}
                      {source.edition ? <Row label="Edition" value={source.edition} /> : null}
                      {source.year ? <Row label="Year" value={String(source.year)} /> : null}
                      {source.transformationNotes ? <Row label="Methodology" value={source.transformationNotes} /> : null}
                      {statuses.length ? (
                        <Row label="Translation status" value={statuses.map(humanStatus).join(" · ")} />
                      ) : null}
                      {source.slug === "oldways-editorial-translations" ? (
                        <Row
                          label="Review"
                          value="MACHINE_ASSISTED rows await independent editorial review. Only EDITORIAL rows have completed review."
                        />
                      ) : null}
                      {source.licence ? <Row label="Licence / ownership" value={source.licence} /> : null}
                      <Row label="Commercial use" value={source.commercialUseAllowed ? "Allowed" : "Not allowed"} />
                      {source.copyrightStatus ? <Row label="Copyright status" value={source.copyrightStatus.replaceAll("_", " ")} /> : null}
                      {source.url ? (
                        <Row label="Source" value={<a href={source.url} className="break-all text-indigo">{source.url}</a>} />
                      ) : null}
                      {source.attributionText ? <Row label="Attribution" value={source.attributionText} /> : null}
                    </dl>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-soft">No source is currently available in this language.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function humanStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-ink-soft">{label}</dt>
      <dd className="mt-1 leading-6">{value}</dd>
    </div>
  );
}
