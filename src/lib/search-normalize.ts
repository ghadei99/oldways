export function foldSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/sh/g, "s")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ALIASES: Record<string, string[]> = {
  urvasi: ["urvashi"],
  urvashi: ["urvasi"],
  vrtra: ["vritra"],
  vritra: ["vrtra"],
  visvamitra: ["vishvamitra"],
  vishvamitra: ["visvamitra"],
  nasadiya: ["nasadiyasukta"],
  purusa: ["purusha"],
  purusha: ["purusa"],
  hiranyagarbha: ["hiranyagarbha sukta"],
};

export function searchNeedles(query: string): string[] {
  const folded = foldSearchText(query);
  if (!folded) return [];
  const extra = ALIASES[folded] ?? [];
  return [...new Set([folded, ...extra.map(foldSearchText)])];
}

export function matchesFolded(haystack: string, needles: string[]) {
  const folded = foldSearchText(haystack);
  return needles.some((needle) => folded.includes(needle) || needle.includes(folded));
}
