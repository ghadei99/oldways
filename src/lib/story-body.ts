export const STORY_LAYERS = [
  "editorial",
  "source_reading",
  "later_tradition",
  "scholarly",
] as const;

export type StoryLayer = (typeof STORY_LAYERS)[number];

export const STORY_KINDS = [
  "Dialogue",
  "Creation",
  "Ritual",
  "Myth",
  "Society",
  "Funerary",
  "Marriage",
  "Cosmology",
] as const;

export type StoryKind = (typeof STORY_KINDS)[number];

export type StoryBlock = {
  id: string;
  type: "paragraph" | "note" | "source_spotlight";
  layer?: StoryLayer;
  text: string;
  refs?: string[];
  spotlightRef?: string;
};

export type StoryBody = {
  kind?: StoryKind | null;
  primarySourceLabel?: string | null;
  relatedStorySlugs?: string[];
  blocks: StoryBlock[];
};

export function parseStoryBody(raw: string): StoryBody {
  try {
    const parsed = JSON.parse(raw) as StoryBody;
    if (!parsed?.blocks) return { blocks: [] };
    return parsed;
  } catch {
    return { blocks: [{ id: "raw", type: "paragraph", text: raw }] };
  }
}

const REF_RE = /\{ref:([^}]+)\}/g;

export function splitTextWithRefs(text: string) {
  const parts: { type: "text" | "ref"; value: string }[] = [];
  let last = 0;
  for (const match of text.matchAll(REF_RE)) {
    const index = match.index ?? 0;
    if (index > last) {
      parts.push({ type: "text", value: text.slice(last, index) });
    }
    parts.push({ type: "ref", value: match[1] });
    last = index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return parts;
}

export function refsFromBlock(block: StoryBlock): string[] {
  const fromText = [...block.text.matchAll(REF_RE)].map((m) => m[1]);
  const listed = block.refs ?? [];
  const spotlight = block.spotlightRef ? [block.spotlightRef] : [];
  return [...new Set([...listed, ...fromText, ...spotlight])];
}

export function collectStoryRefs(body: StoryBody): string[] {
  return [...new Set(body.blocks.flatMap(refsFromBlock))];
}

export function storyWordCount(body: StoryBody): number {
  return body.blocks.reduce((sum, block) => {
    const words = block.text.trim().split(/\s+/).filter(Boolean);
    return sum + words.length;
  }, 0);
}

export function estimatedReadingMinutes(body: StoryBody): number {
  return Math.max(1, Math.round(storyWordCount(body) / 200));
}

export function layerLabel(layer: StoryLayer | undefined, type: StoryBlock["type"]) {
  if (type === "source_spotlight") return "Primary text";
  if (layer === "later_tradition") return "Later tradition";
  if (layer === "scholarly") return "Scholarly interpretation";
  if (layer === "source_reading") return "Primary source";
  if (layer === "editorial") return "Editorial explanation";
  return null;
}
