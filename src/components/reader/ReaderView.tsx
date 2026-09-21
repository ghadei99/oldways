"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LANGUAGES,
  TRANSLATION_LANGS,
  languageLabel,
  type LangId,
} from "@/lib/languages";
import { formatReference } from "@/lib/references";

const PREF_KEY = "oldways-reading";

type Translator = { id: string; name: string; isHistorical: boolean };
type Source = {
  id: string;
  title: string;
  year: number | null;
  edition?: string | null;
  licence: string | null;
  copyrightStatus: string;
  attributionText: string | null;
  url: string | null;
  translatorName: string | null;
  digitalProject?: string | null;
  commercialUseAllowed?: boolean | null;
  kind?: string | null;
};
type Translation = {
  id: string;
  language: string;
  text: string;
  isDemo: boolean;
  notes: string | null;
  status?: string | null;
  visibility?: string | null;
  workTitle?: string | null;
  publicationYear?: number | null;
  edition?: string | null;
  copyrightStatus?: string | null;
  attribution?: string | null;
  translator: Translator | null;
  source: Source | null;
  historicalWork?: Source | null;
};
type Theme = { slug: string; title: string };
type StoryHit = { slug: string; title: string };

export type ReaderPassage = {
  id: string;
  canonicalReference: string;
  orderIndex: number;
  originalText: string;
  iast: string | null;
  translations: Translation[];
  themes: Theme[];
  stories: StoryHit[];
  textSource: Source | null;
};

export type SidebarSukta = {
  number: string;
  title: string | null;
  passageCount: number;
};
export type SidebarMandala = {
  number: string;
  title: string | null;
  suktas: SidebarSukta[];
};

export type ReaderPayload = {
  corpusSlug: string;
  corpusTitle: string;
  mandalaNumber: string;
  suktaNumber: string;
  suktaTitle: string | null;
  suktaKind?: string | null;
  suktaContext?: string | null;
  hymnStories?: StoryHit[];
  highlight: string | null;
  passages: ReaderPassage[];
  tree: SidebarMandala[];
  prevHref: string | null;
  nextHref: string | null;
  sanskritWithheld?: boolean;
  sanskritWithheldReason?: string | null;
};

type Prefs = {
  lang: Exclude<LangId, "sa">;
  translatorId: string | "any";
  transliteration: boolean;
  fontScale: number;
};

function loadPrefs(): Prefs {
  const fallback: Prefs = {
    lang: "en",
    translatorId: "any",
    transliteration: true,
    fontScale: 1,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function scriptClass(lang: string) {
  if (lang === "or") return "font-orya";
  if (lang === "bn") return "font-beng";
  if (lang === "hi" || lang === "sa") return "font-deva";
  return "scripture";
}

export function ReaderView({ data }: { data: ReaderPayload }) {
  const [prefs, setPrefs] = useState<Prefs>({
    lang: "en",
    translatorId: "any",
    transliteration: true,
    fontScale: 1,
  });
  const [selectedId, setSelectedId] = useState(
    data.passages.find((p) => p.orderIndex === Number(data.highlight))?.id ??
      data.passages[0]?.id,
  );
  const [navOpen, setNavOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [openMandala, setOpenMandala] = useState(data.mandalaNumber);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    // Hydrate the browser-only persisted preference after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPrefs());
  }, []);

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    const node = data.highlight
      ? document.getElementById(`mantra-${data.highlight}`)
      : null;
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [data.highlight]);

  const selected =
    data.passages.find((p) => p.id === selectedId) ?? data.passages[0];

  const translatorsForLang = useMemo(() => {
    if (!selected) return [];
    const list = selected.translations.filter((t) => t.language === prefs.lang);
    const unique = new Map<string, Translator>();
    for (const t of list) {
      if (t.translator) unique.set(t.translator.id, t.translator);
    }
    return [...unique.values()];
  }, [selected, prefs.lang]);

  function pickTranslation(passage: ReaderPassage) {
    const all = passage.translations.filter((t) => t.language === prefs.lang);
    if (!all.length) return null;
    if (prefs.translatorId !== "any") {
      return all.find((t) => t.translator?.id === prefs.translatorId) ?? all[0];
    }
    return all.find((t) => t.translator?.isHistorical) ?? all[0];
  }

  const filteredTree = data.tree
    .map((m) => ({
      ...m,
      suktas: m.suktas.filter((s) => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return (
          s.number.includes(q) ||
          (s.title ?? "").toLowerCase().includes(q) ||
          m.number.includes(q)
        );
      }),
    }))
    .filter((m) => (filter ? m.suktas.length > 0 : true));

  async function copyRef(ref: string) {
    await navigator.clipboard.writeText(formatReference(ref));
  }

  async function sharePassage(passage: ReaderPassage) {
    const url = `${window.location.origin}/texts/${data.corpusSlug}/${data.mandalaNumber}/${data.suktaNumber}/${passage.orderIndex}`;
    if (navigator.share) {
      await navigator.share({ title: formatReference(passage.canonicalReference), url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  const counts = selected
    ? TRANSLATION_LANGS.map((l) => ({
        ...l,
        count: selected.translations.filter((t) => t.language === l.id).length,
      }))
    : [];

  return (
    <div className="mx-auto grid max-w-[88rem] lg:grid-cols-[16.5rem_minmax(0,1fr)_18rem]">
      <aside className="hidden border-r border-rule lg:block">
        <Sidebar
          corpusTitle={data.corpusTitle}
          corpusSlug={data.corpusSlug}
          tree={filteredTree}
          filter={filter}
          setFilter={setFilter}
          openMandala={openMandala}
          setOpenMandala={setOpenMandala}
          currentMandala={data.mandalaNumber}
          currentSukta={data.suktaNumber}
        />
      </aside>

      <section
        className="min-w-0 px-4 py-6 md:px-8 md:py-8"
        style={{ fontSize: `${prefs.fontScale}rem` }}
      >
        <div className="sticky top-[3.25rem] z-20 -mx-4 mb-6 border-b border-rule bg-[color-mix(in_oklab,var(--paper)_92%,white)]/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
          <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
            {data.corpusTitle} · Maṇḍala {data.mandalaNumber}
          </p>
          <h1 className="mt-1 font-serif text-3xl leading-tight tracking-tight">
            Sukta {data.suktaNumber}
            {data.suktaTitle ? (
              <span className="text-ink-soft"> — {data.suktaTitle}</span>
            ) : null}
          </h1>
          {data.suktaKind || data.suktaContext ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
              {data.suktaKind ? <span className="uppercase tracking-[0.14em]">{data.suktaKind}</span> : null}
              {data.suktaKind && data.suktaContext ? " · " : null}
              {data.suktaContext}
            </p>
          ) : null}
          {data.hymnStories && data.hymnStories.length > 0 ? (
            <p className="mt-3 text-sm">
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-ink-soft">
                Explored in
              </span>
              {data.hymnStories.map((story) => (
                <Link
                  key={story.slug}
                  href={`/stories/${story.slug}`}
                  className="ml-3 text-indigo"
                >
                  {story.title}
                  <span className="ml-1">→</span>
                </Link>
              ))}
            </p>
          ) : null}
          {data.sanskritWithheld ? (
            <p className="mt-3 border border-rule bg-paper-inset px-3 py-2 text-sm leading-6 text-ink-soft">
              {data.sanskritWithheldReason ??
                "Sanskrit from the current encoding is withheld in this build because it is not licensed for commercial use."}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {LANGUAGES.filter((l) => l.id !== "sa").map((l) => {
              const available =
                selected?.translations.some((t) => t.language === l.id) ?? false;
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={!available}
                  title={available ? undefined : `${l.native} unavailable for this mantra`}
                  onClick={() =>
                    setPrefs((p) => ({ ...p, lang: l.id, translatorId: "any" }))
                  }
                  className={`border px-2.5 py-1 text-xs tracking-wide ${
                    prefs.lang === l.id
                      ? "border-indigo bg-indigo text-paper-raised"
                      : available
                        ? "border-rule text-ink-soft hover:border-ink/40"
                        : "cursor-not-allowed border-rule text-ink-soft opacity-45"
                  }`}
                  aria-pressed={prefs.lang === l.id}
                >
                  {l.native}
                  <span className="ml-1 opacity-70">
                    {available ? "✓" : "—"}
                  </span>
                </button>
              );
            })}
            <label className="ml-2 flex items-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={prefs.transliteration}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, transliteration: e.target.checked }))
                }
              />
              Transliteration
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              Size
              <input
                type="range"
                min={0.9}
                max={1.2}
                step={0.05}
                value={prefs.fontScale}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, fontScale: Number(e.target.value) }))
                }
                aria-label="Font size"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2 lg:hidden">
            <button
              type="button"
              className="border border-rule px-3 py-1.5 text-xs"
              onClick={() => setNavOpen(true)}
            >
              Contents
            </button>
            <button
              type="button"
              className="border border-rule px-3 py-1.5 text-xs"
              onClick={() => setContextOpen(true)}
            >
              Passage
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {data.passages.map((passage) => {
            const translation = pickTranslation(passage);
            const highlighted =
              data.highlight &&
              String(passage.orderIndex) === String(data.highlight);
            return (
              <article
                key={passage.id}
                id={`mantra-${passage.orderIndex}`}
                className={`scroll-mt-28 border border-rule bg-paper-raised px-5 py-6 md:px-8 ${
                  highlighted ? "mantra-highlight" : ""
                } ${selectedId === passage.id ? "border-indigo/40" : ""}`}
                onClick={() => setSelectedId(passage.id)}
              >
                <header className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="text-sm tracking-[0.14em] text-copper">
                    {data.mandalaNumber}.{data.suktaNumber}.{passage.orderIndex}
                  </h2>
                  <p className="text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">
                    {formatReference(passage.canonicalReference)}
                  </p>
                </header>
                <p className="font-deva text-[1.35rem] leading-[2.05] break-words text-ink">
                  {passage.originalText}
                </p>
                {prefs.transliteration && passage.iast ? (
                  <p className="scripture mt-4 text-[0.98rem] leading-8 text-ink-soft italic">
                    {passage.iast}
                  </p>
                ) : null}
                <div className="mt-5 border-t border-rule pt-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
                    Translation · {languageLabel(prefs.lang)}
                    {translation?.translator
                      ? ` · ${translation.translator.name}`
                      : ""}
                    {translation?.isDemo || translation?.visibility === "DEVELOPMENT"
                      ? " · Development translation"
                      : ""}
                  </p>
                  {translation ? (
                    <>
                      <p
                        className={`mt-2 text-[1.05rem] leading-8 ${scriptClass(prefs.lang)}`}
                      >
                        {translation.text}
                      </p>
                      {translation.status === "MACHINE_ASSISTED" ||
                      translation.status === "EDITORIAL" ? (
                        <details className="mt-3 text-xs leading-5 text-ink-soft">
                          <summary className="cursor-pointer text-indigo">
                            Translation method and review status
                          </summary>
                          <p className="mt-2">
                            Oldways Editorial Translation · {translation.status === "EDITORIAL"
                              ? "editorially reviewed"
                              : "machine-assisted · review pending"}. This is a
                            project-owned rendering, not a historical published
                            translation.
                          </p>
                        </details>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-ink-soft">
                      {languageLabel(prefs.lang)} translation unavailable for
                      this mantra.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <nav className="mt-10 flex justify-between gap-4 text-sm" aria-label="Adjacent hymns">
          {data.prevHref ? (
            <Link href={data.prevHref} className="text-indigo">
              ← Previous sukta
            </Link>
          ) : (
            <span />
          )}
          {data.nextHref ? (
            <Link href={data.nextHref} className="text-indigo">
              Next sukta →
            </Link>
          ) : null}
        </nav>
      </section>

      <aside className="hidden border-l border-rule lg:block">
        {selected ? (
          <ContextPanel
            passage={selected}
            counts={counts}
            translators={translatorsForLang}
            prefs={prefs}
            setPrefs={setPrefs}
            onCopy={() => copyRef(selected.canonicalReference)}
            onShare={() => sharePassage(selected)}
          />
        ) : null}
      </aside>

      {navOpen ? (
        <Sheet title="Contents" onClose={() => setNavOpen(false)}>
          <Sidebar
            corpusTitle={data.corpusTitle}
            corpusSlug={data.corpusSlug}
            tree={filteredTree}
            filter={filter}
            setFilter={setFilter}
            openMandala={openMandala}
            setOpenMandala={setOpenMandala}
            currentMandala={data.mandalaNumber}
            currentSukta={data.suktaNumber}
          />
        </Sheet>
      ) : null}

      {contextOpen && selected ? (
        <Sheet title="Passage" onClose={() => setContextOpen(false)}>
          <ContextPanel
            passage={selected}
            counts={counts}
            translators={translatorsForLang}
            prefs={prefs}
            setPrefs={setPrefs}
            onCopy={() => copyRef(selected.canonicalReference)}
            onShare={() => sharePassage(selected)}
          />
        </Sheet>
      ) : null}
    </div>
  );
}

function Sidebar({
  corpusTitle,
  corpusSlug,
  tree,
  filter,
  setFilter,
  openMandala,
  setOpenMandala,
  currentMandala,
  currentSukta,
}: {
  corpusTitle: string;
  corpusSlug: string;
  tree: SidebarMandala[];
  filter: string;
  setFilter: (v: string) => void;
  openMandala: string;
  setOpenMandala: (v: string) => void;
  currentMandala: string;
  currentSukta: string;
}) {
  return (
    <div className="sticky top-[3.35rem] max-h-[calc(100vh-3.35rem)] overflow-y-auto px-4 py-5">
      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-ink-soft">
        {corpusTitle}
      </p>
      <label className="mt-3 block">
        <span className="sr-only">Filter hymns</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find maṇḍala or sukta"
          className="w-full border border-rule bg-paper-raised px-3 py-2 text-sm"
        />
      </label>
      <ul className="mt-4 space-y-1">
        {tree.map((mandala) => {
          const open = openMandala === mandala.number;
          return (
            <li key={mandala.number}>
              <button
                type="button"
                className="flex w-full items-center justify-between py-1.5 text-left text-sm"
                aria-expanded={open}
                onClick={() =>
                  setOpenMandala(open ? "" : mandala.number)
                }
              >
                <span>Maṇḍala {mandala.number}</span>
                <span className="text-ink-soft">{open ? "–" : "+"}</span>
              </button>
              {open ? (
                <ul className="mb-2 ml-3 border-l border-rule pl-3">
                  {mandala.suktas.length ? (
                    mandala.suktas.map((sukta) => {
                      const current =
                        currentMandala === mandala.number &&
                        currentSukta === sukta.number;
                      return (
                        <li key={sukta.number}>
                          <Link
                            href={`/texts/${corpusSlug}/${mandala.number}/${sukta.number}`}
                            className={`block py-1 text-sm ${
                              current ? "text-indigo" : "text-ink-soft hover:text-ink"
                            }`}
                          >
                            {sukta.number}
                            {sukta.title ? ` — ${sukta.title}` : ""}
                          </Link>
                        </li>
                      );
                    })
                  ) : (
                    <li className="py-1 text-xs text-ink-soft">
                      No suktas in this maṇḍala
                    </li>
                  )}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ContextPanel({
  passage,
  counts,
  translators,
  prefs,
  setPrefs,
  onCopy,
  onShare,
}: {
  passage: ReaderPassage;
  counts: { id: string; native: string; count: number }[];
  translators: Translator[];
  prefs: Prefs;
  setPrefs: (update: (p: Prefs) => Prefs) => void;
  onCopy: () => void;
  onShare: () => void;
}) {
  const translation = passage.translations.find((t) => {
    if (t.language !== prefs.lang) return false;
    if (prefs.translatorId !== "any") return t.translator?.id === prefs.translatorId;
    return t.translator?.isHistorical || translators.length === 1;
  }) ?? passage.translations.find((t) => t.language === prefs.lang);

  return (
    <div className="sticky top-[3.35rem] max-h-[calc(100vh-3.35rem)] overflow-y-auto px-5 py-6">
      <p className="text-[0.68rem] uppercase tracking-[0.24em] text-ink-soft">
        Selected mantra
      </p>
      <p className="mt-2 font-serif text-2xl">{formatReference(passage.canonicalReference)}</p>
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
            Translations
          </dt>
          <dd className="mt-1 text-ink">
            {counts.map((c) => (
              <span key={c.id} className="mr-3">
                {c.native} {c.count ? "✓" : "— unavailable"}
              </span>
            ))}
          </dd>
        </div>
        {translators.length > 1 ? (
          <div>
            <dt className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
              Translator
            </dt>
            <dd className="mt-2">
              <select
                className="w-full border border-rule bg-paper-raised px-2 py-1.5 text-sm"
                value={prefs.translatorId}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, translatorId: e.target.value }))
                }
              >
                <option value="any">Preferred / first</option>
                {translators.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
            Appears in
          </dt>
          <dd className="mt-2 space-y-2">
            {passage.themes.map((theme) => (
              <Link
                key={theme.slug}
                href={`/explore/themes/${theme.slug}`}
                className="block text-indigo"
              >
                {theme.title}
              </Link>
            ))}
            {passage.stories.map((story) => (
              <Link
                key={story.slug}
                href={`/stories/${story.slug}`}
                className="block text-indigo"
              >
                {story.title}
                <span className="ml-1 text-ink-soft">Read story →</span>
              </Link>
            ))}
            {!passage.themes.length && !passage.stories.length ? (
              <span className="text-ink-soft">No editorial links yet</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
            Sources
          </dt>
          <dd className="mt-2">
            <details>
              <summary className="cursor-pointer text-sm text-indigo">
                Primary text and translation
              </summary>
              <div className="mt-3 space-y-4 text-sm leading-6 text-ink-soft">
                <div>
                  <span className="block text-[0.65rem] uppercase tracking-[0.16em] text-ink">
                    Primary text
                  </span>
                  <p className="mt-1">Rigveda Sanskrit</p>
                  <p>
                    Digital source: {passage.textSource?.title ?? "See Sources"}
                  </p>
                  {passage.textSource?.digitalProject ? (
                    <p>Project: {passage.textSource.digitalProject}</p>
                  ) : null}
                  {passage.textSource?.edition ? (
                    <p>Edition: {passage.textSource.edition}</p>
                  ) : null}
                  {passage.textSource?.licence ? (
                    <p>Licence: {passage.textSource.licence}</p>
                  ) : null}
                  {typeof passage.textSource?.commercialUseAllowed === "boolean" ? (
                    <p>
                      Commercial use:{" "}
                      {passage.textSource.commercialUseAllowed ? "yes" : "no"}
                    </p>
                  ) : null}
                </div>
                <div>
                  <span className="block text-[0.65rem] uppercase tracking-[0.16em] text-ink">
                    Translation
                  </span>
                  {translation ? (
                    <>
                      <p>{languageLabel(prefs.lang)}</p>
                      <p>{translation.translator?.name ?? "Unattributed"}</p>
                      {translation.workTitle || translation.historicalWork?.title ? (
                        <p>
                          {translation.workTitle ?? translation.historicalWork?.title}
                          {translation.publicationYear || translation.historicalWork?.year
                            ? ` (${translation.publicationYear ?? translation.historicalWork?.year})`
                            : ""}
                        </p>
                      ) : null}
                      {translation.isDemo || translation.visibility === "DEVELOPMENT" ? (
                        <p>Development translation</p>
                      ) : null}
                      {translation.status === "MACHINE_ASSISTED" ? (
                        <p>Machine-assisted · editorial review pending</p>
                      ) : null}
                      {translation.status === "EDITORIAL" ? (
                        <p>Editorially reviewed</p>
                      ) : null}
                      <p>
                        Digital transcription:{" "}
                        {translation.source?.title ?? "not recorded"}
                      </p>
                      {translation.source?.licence ? (
                        <p>Digital licence: {translation.source.licence}</p>
                      ) : null}
                    </>
                  ) : (
                    <p>No translation selected</p>
                  )}
                </div>
              </div>
            </details>
          </dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="border border-rule px-3 py-2 text-sm hover:border-indigo"
        >
          Copy reference
        </button>
        <button
          type="button"
          onClick={onShare}
          className="border border-rule px-3 py-2 text-sm hover:border-indigo"
        >
          Share passage
        </button>
      </div>
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-md border-t border-rule bg-paper">
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <p className="text-sm tracking-wide">{title}</p>
          <button type="button" onClick={onClose} className="text-sm">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
