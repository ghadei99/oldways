"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { formatReference, passageHref } from "@/lib/references";
import type { PassagePreview } from "@/lib/stories/passage-preview";
import { unavailableEnglishMessage } from "@/lib/stories/passage-preview";

export function SourceRefChip({
  compact,
  preview,
  className = "",
}: {
  compact: string;
  preview?: PassagePreview | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const href = preview?.href ?? passageHref(compact);
  const label = preview?.display ?? formatReference(compact);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  if (!preview) {
    return (
      <Link
        href={href}
        className={`ref-chip ${className}`}
        aria-label={`Open ${label}`}
      >
        {label}
        <span aria-hidden="true">→</span>
      </Link>
    );
  }

  return (
    <span ref={wrapRef} className="relative inline-block max-w-full">
      <button
        type="button"
        className={`ref-chip ${className}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <span aria-hidden="true">→</span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className="fixed inset-x-3 bottom-3 z-40 max-h-[70vh] overflow-y-auto border border-rule bg-paper-raised p-4 shadow-md md:absolute md:inset-auto md:bottom-auto md:left-0 md:top-[calc(100%+0.4rem)] md:z-30 md:w-[22rem] md:max-h-none"
        >
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-ink-soft">
            Primary text
          </p>
          <p className="mt-1 font-serif text-xl">{label}</p>
          {preview.originalText ? (
            <p className="font-deva mt-3 text-lg leading-8 break-words">
              {preview.originalText}
            </p>
          ) : null}
          {preview.iast ? (
            <p className="scripture mt-2 text-sm leading-6 break-words text-ink-soft">
              {preview.iast}
            </p>
          ) : null}
          <p className="mt-3 text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">
            English translation
          </p>
          {preview.english ? (
            <>
              {preview.english.isDevelopment ? (
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-copper">
                  Development translation
                </p>
              ) : null}
              <p className="scripture mt-1 text-sm leading-6">
                {preview.english.text.length > 280
                  ? `${preview.english.text.slice(0, 280).trim()}…`
                  : preview.english.text}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              {unavailableEnglishMessage()}
            </p>
          )}
          <Link
            href={href}
            className="mt-4 inline-block text-sm text-indigo"
          >
            Open passage →
          </Link>
        </div>
      ) : null}
    </span>
  );
}
