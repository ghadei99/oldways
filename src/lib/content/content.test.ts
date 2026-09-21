import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { validateProductionProvenance } from "./provenance";
import { applyPreferredSanskritSource } from "./preferred-source";
import {
  isObsoleteSourceSlug,
  isProductionVisibleTranslation,
  sanskritSourceAllowedInCurrentMode,
  translationWhere,
  TRANSLATION_STATUS,
  VISIBILITY,
} from "./visibility";
import { parseCanonicalReference, passageHref } from "../references";
import {
  parseGriffithWikitext,
  parseProofreadHymn,
} from "../corpus/parse-griffith-wikisource";

describe("production provenance", () => {
  it("fails when a production original text has no source", () => {
    const issues = validateProductionProvenance({
      passages: [
        {
          id: "p1",
          canonicalReference: "RV.10.129.1",
          originalText: "नासदासीन्",
          displayed: true,
          textSource: null,
        },
      ],
      translations: [],
    });
    expect(issues.some((i) => i.kind === "passage")).toBe(true);
  });

  it("fails when a production translation lacks translator or licence", () => {
    const issues = validateProductionProvenance({
      passages: [],
      translations: [
        {
          id: "t1",
          language: "en",
          visibility: VISIBILITY.PRODUCTION,
          status: TRANSLATION_STATUS.PUBLIC_DOMAIN,
          isDemo: false,
          translatorId: null,
          sourceId: "s1",
          copyrightStatus: null,
          source: { licence: null, copyrightStatus: "" },
        },
      ],
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("does not block development translations missing scholarly provenance", () => {
    const issues = validateProductionProvenance({
      passages: [
        {
          id: "p1",
          canonicalReference: "RV.10.129.1",
          originalText: "नासदासीन्",
          displayed: true,
          textSource: {
            slug: "gretil-aufrecht-2019",
            licence: "CC BY-NC-SA 4.0",
            copyrightStatus: "digital_encoding_cc_by_nc_sa_4",
            visibility: VISIBILITY.DEVELOPMENT,
            commercialUseAllowed: false,
          },
        },
      ],
      translations: [
        {
          id: "t1",
          language: "hi",
          visibility: VISIBILITY.DEVELOPMENT,
          status: TRANSLATION_STATUS.WORKING_TRANSLATION,
          isDemo: true,
          translatorId: null,
          sourceId: null,
          copyrightStatus: null,
          source: null,
        },
      ],
    });
    expect(issues).toEqual([]);
  });
});

describe("development translations in production mode", () => {
  it("hides demo and non-production statuses", () => {
    expect(
      isProductionVisibleTranslation({
        visibility: VISIBILITY.DEVELOPMENT,
        status: TRANSLATION_STATUS.WORKING_TRANSLATION,
        isDemo: true,
      }),
    ).toBe(false);
    expect(
      isProductionVisibleTranslation({
        visibility: VISIBILITY.PRODUCTION,
        status: TRANSLATION_STATUS.PUBLIC_DOMAIN,
        isDemo: false,
      }),
    ).toBe(true);
    expect(translationWhere(false)).toMatchObject({
      visibility: VISIBILITY.PRODUCTION,
      isDemo: false,
    });
  });
});

describe("Griffith wikitext", () => {
  it("extracts numbered verses after the header template", () => {
    const wikitext = `{{header
 | title = {{auto parents}}
 | translator = Ralph T.H. Griffith
 | notes =
}}

1. THEN was not non-existent nor existent: there was no realm of air.
2. Death was not then, nor was there aught immortal.
`;
    const verses = parseGriffithWikitext(wikitext);
    expect(verses).toHaveLength(2);
    expect(verses[0]).toMatchObject({ mantra: 1 });
    expect(verses[0].text).toContain("THEN was not non-existent");
  });

  it("does not assign a later hymn's verses to the previous sukta", () => {
    const wikitext = `<section begin="HYMN 1" />
{{ppoem|
{{sc|I laud}} Agni, the chosen Priest, God, minister of sacrifice,
The Hotar, lavishest of wealth.
2 <<< Worthy is Agni to be praised by living as by ancient seers:
He shall bring hitherward the Gods.
}}
<section end="hymn1" />
<section begin="hymn2" />
{{ppoem|
{{sc|Beautiful}} Vayu, come, for thee these Soma drops have been prepared:
2 <<< Knowing the days, with Soma juice poured forth, the singers glorify
Thee, Vayu, with their hymns of praise.
}}
<section end="hymn2" />`;
    const hymn1 = parseProofreadHymn(wikitext, 1);
    const hymn2 = parseProofreadHymn(wikitext, 2);
    expect(hymn1.some((v) => v.text.includes("Vayu"))).toBe(false);
    expect(hymn2.some((v) => /I laud/i.test(v.text))).toBe(false);
    expect(hymn1[0]?.text).toMatch(/Agni, the chosen Priest/);
  });
});

describe("sanskrit visibility", () => {
  const gretil = {
    visibility: VISIBILITY.DEVELOPMENT,
    commercialUseAllowed: false,
  };
  const productionSafe = {
    visibility: VISIBILITY.PRODUCTION,
    commercialUseAllowed: true,
  };

  it("allows GRETIL in development and blocks it in commercial build", () => {
    const env = process.env as {
      NODE_ENV?: string;
      COMMERCIAL_BUILD?: string;
      ALLOW_RESEARCH_SANSKRIT?: string;
      SHOW_DEMO_TRANSLATIONS?: string;
    };
    const previous = {
      NODE_ENV: env.NODE_ENV,
      COMMERCIAL_BUILD: env.COMMERCIAL_BUILD,
      ALLOW_RESEARCH_SANSKRIT: env.ALLOW_RESEARCH_SANSKRIT,
      SHOW_DEMO_TRANSLATIONS: env.SHOW_DEMO_TRANSLATIONS,
    };
    try {
      env.NODE_ENV = "development";
      delete env.COMMERCIAL_BUILD;
      expect(sanskritSourceAllowedInCurrentMode(gretil)).toBe(true);

      env.NODE_ENV = "production";
      env.COMMERCIAL_BUILD = "true";
      expect(sanskritSourceAllowedInCurrentMode(gretil)).toBe(false);
      expect(sanskritSourceAllowedInCurrentMode(productionSafe)).toBe(true);
    } finally {
      env.NODE_ENV = previous.NODE_ENV;
      env.COMMERCIAL_BUILD = previous.COMMERCIAL_BUILD;
      env.ALLOW_RESEARCH_SANSKRIT = previous.ALLOW_RESEARCH_SANSKRIT;
      env.SHOW_DEMO_TRANSLATIONS = previous.SHOW_DEMO_TRANSLATIONS;
    }
  });

  it("fails commercial provenance when preferred source is non-commercial", () => {
    const issues = validateProductionProvenance({
      commercialBuild: true,
      preferredSource: {
        slug: "gretil-aufrecht-2019",
        exists: true,
        visibility: VISIBILITY.DEVELOPMENT,
        licence: "CC BY-NC-SA 4.0",
        copyrightStatus: "digital_encoding_cc_by_nc_sa_4",
        commercialUseAllowed: false,
      },
      passages: [],
      translations: [],
    });
    expect(issues.some((i) => i.kind === "preferred_source")).toBe(true);
  });

  it("knows obsolete seed source slugs", () => {
    expect(isObsoleteSourceSlug("rv-sanskrit-seed")).toBe(true);
    expect(isObsoleteSourceSlug("griffith-1896")).toBe(true);
    expect(isObsoleteSourceSlug("griffith-1896-work")).toBe(false);
  });
});

describe("database witnesses", () => {
  it("keeps one canonical passage with two witnesses and stable story refs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "oldways-"));
    const dbPath = join(dir, "test.db");
    // Use the committed migration rather than `db push`: this exercises the
    // same baseline that production uses and does not depend on Prisma's
    // schema-engine RPC process in the test runner.
    execSync("npx prisma db execute --stdin --schema prisma/schema.prisma", {
      cwd: join(process.cwd()),
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: "pipe",
      input: readFileSync(
        join(process.cwd(), "prisma/migrations/20260921100000_init/migration.sql"),
        "utf8",
      ),
    });
    const prisma = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}` } },
    });

    try {
      const corpus = await prisma.corpus.create({
        data: {
          slug: "rigveda",
          abbreviation: "RV",
          title: "Rigveda",
          tradition: "vedic",
          language: "sanskrit",
        },
      });
      const sukta = await prisma.textDivision.create({
        data: {
          corpusId: corpus.id,
          divisionType: "sukta",
          number: "129",
          orderIndex: 129,
        },
      });
      const gretil = await prisma.source.create({
        data: {
          slug: "gretil-aufrecht-2019",
          title: "GRETIL",
          copyrightStatus: "cc_by_nc_sa",
          licence: "CC BY-NC-SA 4.0",
          visibility: VISIBILITY.DEVELOPMENT,
          commercialUseAllowed: false,
          kind: "digital_corpus",
        },
      });
      const other = await prisma.source.create({
        data: {
          slug: "other-witness",
          title: "Other",
          copyrightStatus: "public_domain",
          licence: "CC0",
          visibility: VISIBILITY.PRODUCTION,
          commercialUseAllowed: true,
          kind: "digital_corpus",
        },
      });
      const passage = await prisma.passage.create({
        data: {
          canonicalReference: "RV.10.129.1",
          corpusId: corpus.id,
          divisionId: sukta.id,
          textSourceId: gretil.id,
          originalText: "gretil-deva",
          sourceText: "gretil-iast",
          normalizedText: "gretil-iast",
          orderIndex: 1,
        },
      });
      await prisma.passageWitness.create({
        data: {
          passageId: passage.id,
          sourceId: gretil.id,
          originalText: "gretil-deva",
          sourceText: "gretil-iast",
          normalizedText: "gretil-iast",
          visibility: VISIBILITY.DEVELOPMENT,
        },
      });
      await prisma.passageWitness.create({
        data: {
          passageId: passage.id,
          sourceId: other.id,
          originalText: "other-deva",
          sourceText: "other-iast",
          normalizedText: "other-iast",
          visibility: VISIBILITY.PRODUCTION,
        },
      });
      const story = await prisma.story.create({
        data: {
          slug: "nasadiya",
          title: "Nasadiya",
          summary: "test",
          body: "{}",
        },
      });
      await prisma.storyReference.create({
        data: {
          storyId: story.id,
          passageId: passage.id,
          referenceType: "citation",
          orderIndex: 0,
        },
      });

      const witnesses = await prisma.passageWitness.findMany({
        where: { passageId: passage.id },
      });
      expect(witnesses).toHaveLength(2);

      const resolved = await prisma.passage.findUnique({
        where: { canonicalReference: "RV.10.129.1" },
      });
      expect(resolved?.id).toBe(passage.id);
      expect(parseCanonicalReference("RV.10.129.1")?.compact).toBe("RV.10.129.1");
      expect(passageHref("RV.10.129.1")).toBe("/texts/rigveda/10/129/1");

      await applyPreferredSanskritSource(prisma, "other-witness");
      const after = await prisma.passage.findUnique({
        where: { canonicalReference: "RV.10.129.1" },
      });
      expect(after?.originalText).toBe("other-deva");
      expect(after?.id).toBe(passage.id);

      const stillLinked = await prisma.storyReference.findFirst({
        where: { storyId: story.id },
      });
      expect(stillLinked?.passageId).toBe(passage.id);

      await applyPreferredSanskritSource(prisma, "other-witness");
      const again = await prisma.passage.findUnique({
        where: { canonicalReference: "RV.10.129.1" },
      });
      expect(again?.originalText).toBe("other-deva");

      await prisma.source.create({
        data: {
          slug: "rv-sanskrit-seed",
          title: "obsolete",
          copyrightStatus: "unpublished_demo",
          licence: "none",
        },
      });
      const { removeObsoleteSources } = await import("./stale-sources");
      const removed = await removeObsoleteSources(prisma);
      expect(removed).toContain("rv-sanskrit-seed");
      expect(
        await prisma.source.findUnique({ where: { slug: "rv-sanskrit-seed" } }),
      ).toBeNull();
    } finally {
      await prisma.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);
});
