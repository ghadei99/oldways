import Link from "next/link";
import { EpistemicLabel } from "@/components/epistemic/EpistemicLabel";
import type { PassagePreview } from "@/lib/stories/passage-preview";
import { unavailableEnglishMessage } from "@/lib/stories/passage-preview";

export function SourceSpotlight({
  preview,
  note,
}: {
  preview: PassagePreview | null;
  note?: string;
}) {
  if (!preview) return null;
  return (
    <aside className="my-8 border border-rule bg-paper-inset/70 px-4 py-5 md:px-6">
      <EpistemicLabel tone="source">What does the source say?</EpistemicLabel>
      <p className="font-serif text-2xl">{preview.display}</p>
      {note ? (
        <p className="mt-2 text-sm leading-6 text-ink-soft">{note}</p>
      ) : null}
      {preview.originalText ? (
        <p className="font-deva mt-4 text-xl leading-9 break-words">
          {preview.originalText}
        </p>
      ) : preview.sanskritWithheld ? (
        <p className="mt-4 text-sm text-ink-soft">
          Sanskrit from the current encoding is not shown in this build.
        </p>
      ) : null}
      {preview.iast ? (
        <p className="scripture mt-2 text-base leading-7 break-words text-ink-soft">
          {preview.iast}
        </p>
      ) : null}
      <div className="mt-4">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
          English translation
        </p>
        {preview.english?.isDevelopment ? (
          <EpistemicLabel tone="copper">Development translation</EpistemicLabel>
        ) : null}
        {preview.english ? (
          <p className="scripture mt-2 text-lg leading-8">{preview.english.text}</p>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            {unavailableEnglishMessage()}
          </p>
        )}
      </div>
      <Link href={preview.href} className="mt-5 inline-block text-sm text-indigo">
        Open in reader →
      </Link>
    </aside>
  );
}
