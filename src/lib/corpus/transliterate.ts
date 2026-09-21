import Sanscript from "@sanskrit-coders/sanscript";

/** Combining marks stored in GRETIL <orig> for Vedic accent. */
const ACCENT_RE = /[\u030D\u0331]/g;

export function iastForDisplay(sourceIast: string) {
  return sourceIast.replace(/\s+/g, " ").trim();
}

export function iastWithoutAccents(sourceIast: string) {
  return sourceIast.replace(ACCENT_RE, "").replace(/\s+/g, " ").trim();
}

/**
 * GRETIL uses ḻ (ISO 15919) for Devanagari ळ. Sanscript IAST treats ḷ as vocalic ऌ.
 * Route through Harvard-Kyoto, mapping the ḻ leftover `zh` to HK `L` (ळ).
 */
export function iastToDevanagari(sourceIast: string) {
  const plain = iastWithoutAccents(sourceIast).replaceAll("ṁ", "ṃ");
  const hk = Sanscript.t(plain, "iast", "hk").replaceAll("zh", "L");
  return Sanscript.t(hk, "hk", "devanagari").trim();
}
