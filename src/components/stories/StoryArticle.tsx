import { SourceRefChip } from "@/components/stories/SourceRefChip";
import { SourceSpotlight } from "@/components/stories/SourceSpotlight";
import { EpistemicLabel } from "@/components/epistemic/EpistemicLabel";
import {
  estimatedReadingMinutes,
  layerLabel,
  parseStoryBody,
  splitTextWithRefs,
  type StoryLayer,
} from "@/lib/story-body";
import { formatReference, suktaHref } from "@/lib/references";
import type { PassagePreview } from "@/lib/stories/passage-preview";
import Link from "next/link";

type StoryRecord = {
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string;
  layerNote: string | null;
  body: string;
  themes: { theme: { slug: string; title: string } }[];
  figures: { figure: { slug: string; name: string; kind: string } }[];
  references: {
    referenceType: string;
    passage: {
      canonicalReference: string;
      orderIndex: number;
      division: {
        number: string;
        parent: { number: string } | null;
      };
    };
  }[];
};

export function StoryArticle({
  story,
  related,
  previews,
}: {
  story: StoryRecord;
  related: { slug: string; title: string; summary: string }[];
  previews: Record<string, PassagePreview>;
}) {
  const body = parseStoryBody(story.body);
  const primary = story.references.filter((r) => r.referenceType !== "related");
  const first = primary[0]?.passage;
  const openHref =
    first?.division.parent
      ? `${suktaHref(
          "rigveda",
          first.division.parent.number,
          first.division.number,
        )}/${first.orderIndex}`
      : "/texts/rigveda";

  const uniquePrimary = [
    ...new Map(
      primary.map((r) => [r.passage.canonicalReference, r.passage]),
    ).values(),
  ].sort((a, b) => a.canonicalReference.localeCompare(b.canonicalReference, "en", { numeric: true }));
  const rangeText =
    body.primarySourceLabel ??
    (uniquePrimary.length > 1
      ? `Rigveda ${uniquePrimary[0].division.parent?.number}.${uniquePrimary[0].division.number}`
      : uniquePrimary[0]
        ? formatReference(uniquePrimary[0].canonicalReference)
        : null);
  const minutes = estimatedReadingMinutes(body);
  const kind = body.kind ?? "Story";

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-0">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-ink-soft">
        Story · {kind}
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight md:text-5xl">
        {story.title}
      </h1>
      {rangeText ? (
        <p className="mt-3 text-sm uppercase tracking-[0.16em] text-ink-soft">
          {rangeText}
        </p>
      ) : null}
      {story.subtitle ? (
        <p className="scripture mt-4 text-xl leading-8 text-ink-soft">
          {story.subtitle}
        </p>
      ) : null}

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
            Primary source
          </dt>
          <dd className="mt-1">{rangeText ?? "See references below"}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
            Reading time
          </dt>
          <dd className="mt-1">About {minutes} min</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
            Themes
          </dt>
          <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {story.themes.map(({ theme }) => (
              <Link
                key={theme.slug}
                href={`/explore/themes/${theme.slug}`}
                className="text-indigo"
              >
                {theme.title}
              </Link>
            ))}
          </dd>
        </div>
      </dl>

      <div className="folio-rule my-8" />
      <div className="space-y-6">
        {body.blocks.map((block) => {
          if (block.type === "source_spotlight") {
            return (
              <SourceSpotlight
                key={block.id}
                preview={previews[block.spotlightRef ?? ""] ?? null}
                note={block.text}
              />
            );
          }
          const parts = splitTextWithRefs(block.text);
          const isNote = block.type === "note";
          const label = layerLabel(block.layer as StoryLayer | undefined, block.type);
          const showLabel =
            isNote ||
            block.layer === "source_reading" ||
            block.layer === "later_tradition" ||
            block.layer === "scholarly";
          return (
            <div
              key={block.id}
              data-story-layer={block.layer ?? "editorial"}
              className={
                isNote
                  ? "border-l-2 border-copper/50 bg-paper-inset/60 px-5 py-4"
                  : block.layer === "source_reading"
                    ? "border-l-2 border-indigo/30 pl-4"
                    : ""
              }
            >
              {showLabel && label ? (
                <EpistemicLabel
                  tone={
                    block.layer === "later_tradition"
                      ? "copper"
                      : block.layer === "source_reading"
                        ? "source"
                        : "default"
                  }
                >
                  {label}
                </EpistemicLabel>
              ) : null}
              <p
                className={`scripture text-lg leading-9 ${
                  isNote ? "text-base leading-8" : ""
                }`}
              >
                {parts.map((part, i) =>
                  part.type === "ref" ? (
                    <SourceRefChip
                      key={`${block.id}-${i}`}
                      compact={part.value}
                      preview={previews[part.value]}
                    />
                  ) : (
                    <span key={`${block.id}-${i}`}>{part.value}</span>
                  ),
                )}
              </p>
            </div>
          );
        })}
      </div>

      {story.layerNote ? (
        <p className="mt-10 text-sm leading-6 text-ink-soft">{story.layerNote}</p>
      ) : null}

      <section className="mt-14 border-t border-rule pt-8">
        <h2 className="text-[0.68rem] uppercase tracking-[0.24em] text-ink-soft">
          Primary sources
        </h2>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <p className="font-serif text-2xl">{rangeText}</p>
          <Link
            href={openHref}
            className="border border-indigo bg-indigo px-4 py-2 text-sm tracking-wide text-paper-raised"
          >
            Open text →
          </Link>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {uniquePrimary.map((p) => (
            <li key={p.canonicalReference} className="max-w-full">
              <SourceRefChip
                compact={p.canonicalReference}
                preview={previews[p.canonicalReference]}
                className="ml-0"
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 grid gap-8 border-t border-rule pt-8 md:grid-cols-3">
        <section>
          <h2 className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Related themes
          </h2>
          <ul className="mt-3 space-y-2">
            {story.themes.map(({ theme }) => (
              <li key={theme.slug}>
                <Link href={`/explore/themes/${theme.slug}`} className="text-indigo">
                  {theme.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Referenced figures
          </h2>
          <ul className="mt-3 space-y-2 text-ink">
            {story.figures.map(({ figure }) => (
              <li key={figure.slug}>
                {figure.name}
                <span className="ml-2 text-xs uppercase tracking-wider text-ink-soft">
                  {figure.kind}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-[0.68rem] uppercase tracking-[0.2em] text-ink-soft">
            Related stories
          </h2>
          <ul className="mt-3 space-y-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/stories/${item.slug}`} className="text-indigo">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
