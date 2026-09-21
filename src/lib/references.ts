export type CanonicalRef = {
  abbreviation: string;
  mandala: string;
  sukta?: string;
  mantra?: string;
  parts: string[];
  display: string;
  compact: string;
};

const CORPUS_SLUGS: Record<string, string> = {
  RV: "rigveda",
  rigveda: "rigveda",
};

export function parseCanonicalReference(input: string): CanonicalRef | null {
  const trimmed = input.trim();
  const match = trimmed.match(
    /^(?:RV|ṚV|Rigveda|rigveda)\s*\.?\s*(\d+)\s*[.:/]\s*(\d+)(?:\s*[.:/]\s*(\d+))?$/i,
  );
  if (match) {
    const parts = [match[1], match[2], match[3]].filter(Boolean) as string[];
    return fromParts(parts);
  }
  const numeric = trimmed.match(/^(\d+)\s*[.:/]\s*(\d+)(?:\s*[.:/]\s*(\d+))?$/);
  if (numeric) {
    const parts = [numeric[1], numeric[2], numeric[3]].filter(Boolean) as string[];
    return fromParts(parts);
  }
  return null;
}

export function passageHref(compactOrDisplay: string) {
  const parsed = parseCanonicalReference(compactOrDisplay);
  if (!parsed) return "/texts/rigveda";
  const slug = CORPUS_SLUGS[parsed.abbreviation] ?? "rigveda";
  return `/texts/${slug}/${parsed.parts.join("/")}`;
}

export function formatReference(compact: string) {
  return parseCanonicalReference(compact)?.display ?? compact.replaceAll(".", " ");
}

export function suktaHref(corpusSlug: string, mandala: string, sukta: string) {
  return `/texts/${corpusSlug}/${mandala}/${sukta}`;
}

export function generateCanonicalReference(
  mandala: number | string,
  sukta: number | string,
  mantra: number | string,
) {
  return `RV.${Number(mandala)}.${Number(sukta)}.${Number(mantra)}`;
}

export function parseSourceReference(input: string) {
  const match = input.trim().match(/^RV_(\d+)[.,](\d+)\.(\d+)$/i);
  if (!match) return null;
  return {
    sourceReference: `RV_${Number(match[1])}.${String(match[2]).padStart(3, "0")}.${String(match[3]).padStart(2, "0")}`,
    canonicalReference: generateCanonicalReference(match[1], match[2], match[3]),
    mandala: Number(match[1]),
    sukta: Number(match[2]),
    mantra: Number(match[3]),
  };
}

function fromParts(parts: string[]): CanonicalRef {
  return {
    abbreviation: "RV",
    mandala: parts[0],
    sukta: parts[1],
    mantra: parts[2],
    parts,
    display: `RV ${parts.join(".")}`,
    compact: `RV.${parts.join(".")}`,
  };
}
