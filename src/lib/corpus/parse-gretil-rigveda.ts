import { generateCanonicalReference } from "@/lib/references";
import { iastForDisplay, iastToDevanagari } from "@/lib/corpus/transliterate";

export type ParsedMantra = {
  sourceReference: string;
  canonicalReference: string;
  mandala: number;
  sukta: number;
  mantra: number;
  sourceText: string;
  iast: string;
  devanagari: string;
};

export type ParseReport = {
  verses: ParsedMantra[];
  duplicates: string[];
  malformed: string[];
  skipped: string[];
  warnings: string[];
};

const LG_RE = /<lg\s+xml:id="(RV_[^"]+)"\s*>([\s\S]*?)<\/lg>/g;
const ID_RE = /^RV_(\d+)\.(\d+)\.(\d+)$/;

function decodeXml(text: string) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"');
}

function extractLineText(lgXml: string, keepOrig: boolean) {
  const lines = [...lgXml.matchAll(/<l\b[^>]*>([\s\S]*?)<\/l>/g)].map((m) => {
    let inner = m[1];
    inner = keepOrig
      ? inner.replace(/<orig>([\s\S]*?)<\/orig>/g, "$1")
      : inner.replace(/<orig>[\s\S]*?<\/orig>/g, "");
    inner = inner.replace(/<[^>]+>/g, "");
    return decodeXml(inner).replace(/\s+/g, " ").trim();
  });
  return lines.filter(Boolean).join("\n");
}

export function parseGretilRigvedaXml(
  xml: string,
  opts: { expectComplete?: boolean } = {},
): ParseReport {
  const verses: ParsedMantra[] = [];
  const duplicates: string[] = [];
  const malformed: string[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const match of xml.matchAll(LG_RE)) {
    const xmlId = match[1];
    const parsedId = xmlId.match(ID_RE);
    if (!parsedId) {
      malformed.push(`unexpected xml:id ${xmlId}`);
      continue;
    }
    const mandala = Number(parsedId[1]);
    const sukta = Number(parsedId[2]);
    const mantra = Number(parsedId[3]);
    if (
      !Number.isInteger(mandala) ||
      !Number.isInteger(sukta) ||
      !Number.isInteger(mantra) ||
      mandala < 1 ||
      mandala > 10 ||
      sukta < 1 ||
      mantra < 1
    ) {
      malformed.push(`invalid numbering ${xmlId}`);
      continue;
    }

    const sourceText = extractLineText(match[2], true);
    if (!sourceText) {
      malformed.push(`empty Sanskrit ${xmlId}`);
      continue;
    }

    const canonicalReference = generateCanonicalReference(mandala, sukta, mantra);
    const sourceReference = `RV_${mandala}.${String(sukta).padStart(3, "0")}.${String(mantra).padStart(2, "0")}`;

    if (seen.has(canonicalReference)) {
      duplicates.push(canonicalReference);
      continue;
    }
    seen.add(canonicalReference);

    verses.push({
      sourceReference,
      canonicalReference,
      mandala,
      sukta,
      mantra,
      sourceText,
      iast: iastForDisplay(sourceText),
      devanagari: iastToDevanagari(sourceText),
    });
  }

  if (!verses.length) {
    malformed.push("no <lg> verses found");
  }

  if (opts.expectComplete !== false) {
    const mandalas = new Set(verses.map((v) => v.mandala));
    for (let m = 1; m <= 10; m++) {
      if (!mandalas.has(m)) malformed.push(`missing mandala ${m}`);
    }
  }

  return { verses, duplicates, malformed, skipped, warnings };
}

export function summarizeCorpus(verses: ParsedMantra[]) {
  const suktas = new Set(verses.map((v) => `${v.mandala}.${v.sukta}`));
  const mandalas = new Set(verses.map((v) => v.mandala));
  return {
    mandalas: mandalas.size,
    suktas: suktas.size,
    mantras: verses.length,
  };
}

export function findDuplicateCanonicals(refs: string[]) {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const ref of refs) {
    if (seen.has(ref)) duplicates.push(ref);
    else seen.add(ref);
  }
  return duplicates;
}
