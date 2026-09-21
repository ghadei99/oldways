import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generateCanonicalReference } from "../src/lib/references";
import {
  parseGriffithWikitext,
  wikisourceHymnTitle,
} from "../src/lib/corpus/parse-griffith-wikisource";

const RIGVEDA_SUKTA_COUNTS = [191, 43, 62, 58, 87, 75, 104, 103, 114, 191];
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

function allHymnTitles() {
  const titles: { mandala: number; sukta: number; title: string }[] = [];
  for (let mandala = 1; mandala <= 10; mandala++) {
    const suktaCount = RIGVEDA_SUKTA_COUNTS[mandala - 1];
    for (let sukta = 1; sukta <= suktaCount; sukta++) {
      titles.push({
        mandala,
        sukta,
        title: wikisourceHymnTitle(mandala, sukta),
      });
    }
  }
  return titles;
}

async function fetchBatch(titles: string[]) {
  const url = new URL(API);
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "revisions");
  url.searchParams.set("rvprop", "content");
  url.searchParams.set("rvslots", "main");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("titles", titles.join("|"));

  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      const wait = 8000 * (attempt + 1);
      console.warn(`HTTP ${res.status}; waiting ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      query?: {
        pages?: {
          title: string;
          pageid?: number;
          missing?: boolean;
          revisions?: { slots?: { main?: { content?: string } } }[];
        }[];
      };
    };
    return json.query?.pages ?? [];
  }
  throw new Error(`Rate limited fetching ${titles[0]}`);
}

async function main() {
  const outDir = join(process.cwd(), "data/raw/griffith/wikisource");
  mkdirSync(outDir, { recursive: true });
  const pagesPath = join(outDir, "pages.jsonl");
  const versesPath = join(outDir, "verses.jsonl");
  if (process.argv.includes("--skip-if-present") && existsSync(versesPath)) {
    console.log("Griffith verses.jsonl already present; skipping fetch.");
    return;
  }

  const existing = new Map<string, PageRow>();
  if (existsSync(pagesPath)) {
    for (const line of readFileSync(pagesPath, "utf8").split("\n").filter(Boolean)) {
      const row = JSON.parse(line) as PageRow;
      existing.set(row.title, row);
    }
  }

  const wanted = allHymnTitles();
  const missing = wanted.filter((h) => !existing.has(h.title));
  const batchSize = 10;

  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    const pages = await fetchBatch(batch.map((b) => b.title));
    const byTitle = new Map(pages.map((p) => [p.title, p]));
    for (const hymn of batch) {
      const page = byTitle.get(hymn.title);
      const wikitext = page?.revisions?.[0]?.slots?.main?.content;
      if (!page || page.missing || !wikitext) continue;
      existing.set(hymn.title, {
        mandala: hymn.mandala,
        sukta: hymn.sukta,
        title: page.title,
        pageid: page.pageid ?? null,
        retrievedAt: new Date().toISOString(),
        wikitext,
      });
    }
    writeFileSync(
      pagesPath,
      [...existing.values()].map((p) => JSON.stringify(p)).join("\n"),
    );
    console.log(`fetched ${Math.min(i + batchSize, missing.length)}/${missing.length} remaining batches`);
    await new Promise((r) => setTimeout(r, 1500));
  }

  const pages = [...existing.values()].sort(
    (a, b) => a.mandala - b.mandala || a.sukta - b.sukta,
  );
  const verses: {
    canonicalReference: string;
    text: string;
    wikisourceTitle: string;
  }[] = [];
  const emptyHymns: string[] = [];
  for (const page of pages) {
    const hymnVerses = parseGriffithWikitext(page.wikitext);
    if (!hymnVerses.length) emptyHymns.push(page.title);
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

  writeFileSync(pagesPath, pages.map((p) => JSON.stringify(p)).join("\n"));
  writeFileSync(versesPath, verses.map((v) => JSON.stringify(v)).join("\n"));
  const missingPages = wanted
    .filter((h) => !existing.has(h.title))
    .map((h) => h.title);
  writeFileSync(
    join(outDir, "fetch-report.json"),
    JSON.stringify(
      {
        retrievedAt: new Date().toISOString(),
        api: API,
        method: "MediaWiki query+revisions batches",
        pages: pages.length,
        verses: verses.length,
        missingPages,
        emptyHymns,
      },
      null,
      2,
    ),
  );

  console.log(
    `Wikisource Griffith: pages ${pages.length}, verses ${verses.length}, missing ${missingPages.length}, empty ${emptyHymns.length}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
