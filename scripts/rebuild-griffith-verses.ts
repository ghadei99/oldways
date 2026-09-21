import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateCanonicalReference } from "../src/lib/references";
import {
  pageNamespaceTitle,
  parseGriffithWikitext,
  parsePagesInclude,
  parseProofreadHymn,
} from "../src/lib/corpus/parse-griffith-wikisource";

const UA =
  "Oldways/0.1 (scripture-library ingest; MediaWiki API; local research use)";
const API = "https://en.wikisource.org/w/api.php";

type PageRow = {
  mandala: number;
  sukta: number;
  title: string;
  pageid: number | null;
  retrievedAt: string;
  wikitext: string;
};

async function fetchWikitext(title: string) {
  const url = new URL(API);
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 8000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${title}`);
    const json = (await res.json()) as {
      parse?: { wikitext: string };
      error?: { info: string };
    };
    return json.parse?.wikitext ?? "";
  }
  return "";
}

async function main() {
  const dir = join(process.cwd(), "data/raw/griffith/wikisource");
  const pagesPath = join(dir, "pages.jsonl");
  const versesPath = join(dir, "verses.jsonl");
  const pages: PageRow[] = readFileSync(pagesPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PageRow);

  const verses: {
    canonicalReference: string;
    text: string;
    wikisourceTitle: string;
  }[] = [];
  const emptyAfter: string[] = [];

  for (const page of pages) {
    let hymnVerses = parseGriffithWikitext(page.wikitext);
    const expand = !process.argv.includes("--no-expand-proofread");
    if (!hymnVerses.length && expand) {
      const include = parsePagesInclude(page.wikitext);
      if (include) {
        const chunks: string[] = [];
        for (const n of include.pages) {
          const title = pageNamespaceTitle(include.index, n);
          chunks.push(await fetchWikitext(title));
          await new Promise((r) => setTimeout(r, 400));
        }
        hymnVerses = parseProofreadHymn(chunks.join("\n"), page.sukta);
      }
    }
    if (!hymnVerses.length) emptyAfter.push(page.title);
    for (const verse of hymnVerses) {
      verses.push({
        canonicalReference: generateCanonicalReference(
          page.mandala,
          page.sukta,
          verse.mantra,
        ),
        text: verse.text,
        wikisourceTitle: page.title,
      });
    }
  }

  writeFileSync(versesPath, verses.map((v) => JSON.stringify(v)).join("\n"));
  writeFileSync(
    join(dir, "fetch-report.json"),
    JSON.stringify(
      {
        retrievedAt: new Date().toISOString(),
        pages: pages.length,
        verses: verses.length,
        emptyHymns: emptyAfter,
      },
      null,
      2,
    ),
  );
  console.log(
    `Griffith verses rebuilt: ${verses.length}. Empty hymns: ${emptyAfter.length}`,
  );
  if (emptyAfter.length) console.log(emptyAfter.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
