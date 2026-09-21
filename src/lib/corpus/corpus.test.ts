import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  generateCanonicalReference,
  parseCanonicalReference,
  parseSourceReference,
  passageHref,
} from "@/lib/references";
import {
  findDuplicateCanonicals,
  parseGretilRigvedaXml,
} from "@/lib/corpus/parse-gretil-rigveda";
import { collectStoryRefs, parseStoryBody, splitTextWithRefs } from "@/lib/story-body";
import { parseEditorialJsonl } from "@/lib/translations/editorial-jsonl";
import { iastToDevanagari } from "@/lib/corpus/transliterate";

const fixture = `<?xml version="1.0"?>
<TEI>
  <lg xml:id="RV_10.129.01">
    <l n="10.129.01a">nāsa<orig>̍</orig>d āsī<orig>̱</orig>n no sad ā<orig>̍</orig>sīt</l>
    <l n="10.129.01c">kim ā<orig>̍</orig>sīd gaha<orig>̍</orig>naṁ gabhī<orig>̱</orig>ram ||</l>
  </lg>
  <lg xml:id="RV_1.001.01">
    <l>agnim ī<orig>̍</orig>ḻe purohitaṁ</l>
  </lg>
</TEI>`;

describe("canonical references", () => {
  it("parses RV.10.129.1", () => {
    const parsed = parseCanonicalReference("RV.10.129.1");
    expect(parsed).toMatchObject({
      abbreviation: "RV",
      mandala: "10",
      sukta: "129",
      mantra: "1",
      compact: "RV.10.129.1",
    });
  });

  it("generates unpadded canonical IDs", () => {
    expect(generateCanonicalReference(10, 129, 1)).toBe("RV.10.129.1");
    expect(parseSourceReference("RV_10.129.01")?.canonicalReference).toBe(
      "RV.10.129.1",
    );
  });

  it("returns null for nonexistent / unparsable references", () => {
    expect(parseCanonicalReference("not-a-ref")).toBeNull();
    expect(parseSourceReference("bogus")).toBeNull();
    expect(passageHref("not-a-ref")).toBe("/texts/rigveda");
  });
});

describe("GRETIL parse", () => {
  it("extracts source ids, accents, and Devanagari", () => {
    const report = parseGretilRigvedaXml(fixture, { expectComplete: false });
    expect(report.duplicates).toEqual([]);
    const nasadiya = report.verses.find(
      (v) => v.canonicalReference === "RV.10.129.1",
    );
    expect(nasadiya?.sourceReference).toBe("RV_10.129.01");
    expect(nasadiya?.sourceText).toContain("̍");
    expect(nasadiya?.devanagari).toMatch(/नास/);
    const agni = report.verses.find((v) => v.canonicalReference === "RV.1.1.1");
    expect(agni?.devanagari).toContain("ळ");
  });

  it("detects duplicate canonical references", () => {
    const dup = fixture + fixture.replace("RV_1.001.01", "RV_10.129.01");
    const report = parseGretilRigvedaXml(dup, { expectComplete: false });
    expect(report.duplicates).toContain("RV.10.129.1");
  });

  it("is idempotent at parse layer", () => {
    const a = parseGretilRigvedaXml(fixture, { expectComplete: false }).verses.map((v) => v.canonicalReference);
    const b = parseGretilRigvedaXml(fixture, { expectComplete: false }).verses.map((v) => v.canonicalReference);
    expect(a).toEqual(b);
    expect(findDuplicateCanonicals(a)).toEqual([]);
  });
});

describe("story references", () => {
  it("resolves {ref} tokens to canonical ids", () => {
    const body = parseStoryBody(
      JSON.stringify({
        blocks: [
          {
            id: "p",
            type: "paragraph",
            text: "The hymn opens. {ref:RV.10.129.1}",
          },
        ],
      }),
    );
    const refs = splitTextWithRefs(body.blocks[0].text).filter((p) => p.type === "ref");
    expect(refs[0]?.value).toBe("RV.10.129.1");
    expect(passageHref(refs[0].value)).toBe("/texts/rigveda/10/129/1");
  });

  it("keeps the completion sprint at 19 fully source-backed stories", () => {
    const editorial = JSON.parse(
      readFileSync(new URL("../../../data/editorial/seed.json", import.meta.url), "utf8"),
    ) as {
      stories: { slug: string; primaryRange: string[]; body: { blocks: unknown[] } }[];
    };
    const xml = readFileSync(
      new URL("../../../data/raw/rigveda/sa_Rgveda-edAufrecht.xml", import.meta.url),
      "utf8",
    );
    const corpusRefs = new Set(
      parseGretilRigvedaXml(xml, { expectComplete: true }).verses.map(
        (verse) => verse.canonicalReference,
      ),
    );
    expect(editorial.stories).toHaveLength(19);
    expect(new Set(editorial.stories.map((story) => story.slug)).size).toBe(19);
    for (const story of editorial.stories) {
      const body = parseStoryBody(JSON.stringify(story.body));
      const refs = [...story.primaryRange, ...collectStoryRefs(body)];
      expect(refs.length, story.slug).toBeGreaterThan(0);
      for (const ref of refs) {
        expect(parseCanonicalReference(ref), `${story.slug}: ${ref}`).not.toBeNull();
        expect(corpusRefs.has(ref), `${story.slug}: ${ref}`).toBe(true);
      }
    }
  });

  it("has wrapping-safe reference chips on narrow screens", () => {
    const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.ref-chip[\s\S]*max-width:\s*100%/);
    expect(css).toMatch(/\.ref-chip[\s\S]*overflow-wrap:\s*anywhere/);
  });
});

describe("editorial translation JSONL", () => {
  it("contains a valid, unique machine-assisted translation for every Griffith passage", () => {
    const input = readFileSync(
      new URL("../../../data/translations/oldways-editorial.jsonl", import.meta.url),
      "utf8",
    );
    const parsed = parseEditorialJsonl(input);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(30_819);
    for (const language of ["hi", "or", "bn"]) {
      expect(parsed.rows.filter((row) => row.language === language)).toHaveLength(10_273);
    }
  });
});

describe("transliteration", () => {
  it("converts GRETIL IAST īḻe to Devanagari ळ", () => {
    expect(iastToDevanagari("agnim īḻe")).toContain("ईळे");
  });
});

describe("import identity", () => {
  it("upserts by canonicalReference", () => {
    const src = readFileSync(
      new URL("../../../scripts/import-rigveda.ts", import.meta.url),
      "utf8",
    );
    expect(src).toContain("where: { canonicalReference: verse.canonicalReference }");
    expect(src).toContain("passageId_sourceId");
  });
});
