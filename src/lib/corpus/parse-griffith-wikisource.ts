export type GriffithVerse = {
  mantra: number;
  text: string;
};

export function stripWikiMarkup(input: string) {
  return input
    .replace(/\{\{ppoem\|?/g, "")
    .replace(/\b(?:end|start)=stanza\|/g, "")
    .replace(/\{\{sc\|([^}]+)\}\}/gi, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2")
    .replace(/'{2,}/g, "")
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/^\s*\|.*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function stripBalancedTemplate(wikitext: string, name: string) {
  const start = wikitext.indexOf(`{{${name}`);
  if (start < 0) return wikitext;
  let i = start;
  let depth = 0;
  while (i < wikitext.length) {
    if (wikitext.startsWith("{{", i)) {
      depth += 1;
      i += 2;
      continue;
    }
    if (wikitext.startsWith("}}", i)) {
      depth -= 1;
      i += 2;
      if (depth === 0) {
        return wikitext.slice(0, start) + wikitext.slice(i);
      }
      continue;
    }
    i += 1;
  }
  return wikitext;
}

export function parseGriffithWikitext(wikitext: string): GriffithVerse[] {
  const withoutHeader = stripBalancedTemplate(wikitext, "header");
  const dotted = extractNumberedVerses(
    stripWikiMarkup(withoutHeader),
    /(?:^|\n)\s*(\d+)\.\s+/g,
  );
  if (dotted.length) return dotted;
  const unpunctuated = extractNumberedVerses(
    stripWikiMarkup(withoutHeader),
    /(?:^|\n)\s*(\d+)\s+(?=[A-Z])/g,
  );
  if (unpunctuated.length) return unpunctuated;
  const withoutRefs = withoutHeader.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "");
  const normalized = stripWikiMarkup(
    withoutRefs.replace(/(\d+)\s*<<<+/g, "\n$1. "),
  );
  const verses = extractNumberedVerses(normalized, /(?:^|\n)\s*(\d+)\.\s+/g);
  if (verses[0]?.mantra === 2) {
    const before = normalized.split(/\n\s*2\.\s+/)[0];
    const first = before
      .replace(/HYMN[^\n]*/i, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (first.length > 20) {
      verses.unshift({ mantra: 1, text: first });
    }
  }
  return verses;
}

function extractNumberedVerses(body: string, pattern: RegExp): GriffithVerse[] {
  const matches = [...body.matchAll(pattern)];
  const verses: GriffithVerse[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const mantra = Number(match[1]);
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? body.length) : body.length;
    const text = body
      .slice(start, end)
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[.\-\s]+/, "");
    if (!text) continue;
    verses.push({ mantra, text });
  }
  return verses;
}

export function parsePagesInclude(wikitext: string) {
  const match = wikitext.match(
    /<pages\b[^>]*\bindex="([^"]+)"[^>]*\binclude="([^"]+)"[^>]*>/i,
  );
  if (!match) return null;
  const tosection = wikitext.match(/\btosection="([^"]+)"/i)?.[1] ?? null;
  const index = match[1];
  const pages: number[] = [];
  for (const part of match[2].split(",")) {
    const range = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      for (let n = from; n <= to; n++) pages.push(n);
    } else if (/^\d+$/.test(part.trim())) {
      pages.push(Number(part.trim()));
    }
  }
  return { index, pages, tosection };
}

export function sectionNameMatchesSukta(name: string, sukta: number) {
  const normalized = name.trim().toLowerCase().replace(/[_-]+/g, " ");
  return new RegExp(`^hymn\\s*0*${sukta}$`).test(normalized);
}

export function extractSuktaSections(wikitext: string, sukta: number) {
  const begins = [...wikitext.matchAll(/<section begin="([^"]+)"\s*\/>/gi)];
  if (!begins.length) return wikitext;
  const pieces: string[] = [];
  for (let i = 0; i < begins.length; i++) {
    const name = begins[i][1];
    if (!sectionNameMatchesSukta(name, sukta)) continue;
    const start = (begins[i].index ?? 0) + begins[i][0].length;
    const rest = wikitext.slice(start);
    const next = rest.search(/<section\s+(end|begin)="/i);
    const end = next >= 0 ? start + next : wikitext.length;
    pieces.push(wikitext.slice(start, end));
  }
  return pieces.join("\n");
}

export function parseProofreadHymn(wikitext: string, sukta: number): GriffithVerse[] {
  const sliced = extractSuktaSections(wikitext, sukta);
  return parseGriffithWikitext(sliced || wikitext);
}

export function pageNamespaceTitle(index: string, page: number) {
  return `Page:${index}/${page}`;
}

export function wikisourceHymnTitle(mandala: number, sukta: number) {
  return `The Hymns of the Rigveda/Book ${mandala}/Hymn ${sukta}`;
}
