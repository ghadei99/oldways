-- CreateTable
CREATE TABLE "Corpus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "tradition" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "TextDivision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corpusId" TEXT NOT NULL,
    "parentId" TEXT,
    "divisionType" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT,
    "orderIndex" INTEGER NOT NULL,
    CONSTRAINT "TextDivision_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "Corpus" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TextDivision_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TextDivision" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Passage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canonicalReference" TEXT NOT NULL,
    "sourceReference" TEXT,
    "corpusId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "textSourceId" TEXT,
    "originalText" TEXT NOT NULL,
    "sourceText" TEXT,
    "encoding" TEXT NOT NULL DEFAULT 'IAST',
    "normalizedText" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    CONSTRAINT "Passage_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "Corpus" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Passage_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "TextDivision" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Passage_textSourceId_fkey" FOREIGN KEY ("textSourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PassageWitness" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passageId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceReference" TEXT,
    "originalText" TEXT NOT NULL,
    "sourceText" TEXT,
    "encoding" TEXT NOT NULL DEFAULT 'IAST',
    "normalizedText" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'DEVELOPMENT',
    CONSTRAINT "PassageWitness_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PassageWitness_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transliteration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passageId" TEXT NOT NULL,
    "scheme" TEXT NOT NULL DEFAULT 'IAST',
    "text" TEXT NOT NULL,
    CONSTRAINT "Transliteration_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Translator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "isHistorical" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "corpusId" TEXT,
    "title" TEXT NOT NULL,
    "editor" TEXT,
    "translatorName" TEXT,
    "publisher" TEXT,
    "year" INTEGER,
    "edition" TEXT,
    "url" TEXT,
    "licence" TEXT,
    "copyrightStatus" TEXT NOT NULL,
    "attributionText" TEXT,
    "attributionRequired" BOOLEAN NOT NULL DEFAULT true,
    "dateAccessed" DATETIME,
    "internalNotes" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'edition',
    "visibility" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "commercialUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "digitalProject" TEXT,
    "transformationNotes" TEXT,
    CONSTRAINT "Source_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "Corpus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "corpusId" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL,
    "statsJson" TEXT NOT NULL,
    CONSTRAINT "ImportRun_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "Corpus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passageId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "translatorId" TEXT,
    "sourceId" TEXT,
    "historicalWorkId" TEXT,
    "workTitle" TEXT,
    "publicationYear" INTEGER,
    "edition" TEXT,
    "copyrightStatus" TEXT,
    "attribution" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "visibility" TEXT NOT NULL DEFAULT 'DEVELOPMENT',
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Translation_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Translation_translatorId_fkey" FOREIGN KEY ("translatorId") REFERENCES "Translator" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Translation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Translation_historicalWorkId_fkey" FOREIGN KEY ("historicalWorkId") REFERENCES "Source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "layerNote" TEXT
);

-- CreateTable
CREATE TABLE "StoryReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyId" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "note" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "blockId" TEXT,
    CONSTRAINT "StoryReference_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryReference_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "PassageTheme" (
    "passageId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    PRIMARY KEY ("passageId", "themeId"),
    CONSTRAINT "PassageTheme_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PassageTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryTheme" (
    "storyId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    PRIMARY KEY ("storyId", "themeId"),
    CONSTRAINT "StoryTheme_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Figure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StoryFigure" (
    "storyId" TEXT NOT NULL,
    "figureId" TEXT NOT NULL,

    PRIMARY KEY ("storyId", "figureId"),
    CONSTRAINT "StoryFigure_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryFigure_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Corpus_slug_key" ON "Corpus"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Corpus_abbreviation_key" ON "Corpus"("abbreviation");

-- CreateIndex
CREATE INDEX "TextDivision_corpusId_divisionType_orderIndex_idx" ON "TextDivision"("corpusId", "divisionType", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "TextDivision_corpusId_parentId_divisionType_number_key" ON "TextDivision"("corpusId", "parentId", "divisionType", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Passage_canonicalReference_key" ON "Passage"("canonicalReference");

-- CreateIndex
CREATE INDEX "Passage_corpusId_orderIndex_idx" ON "Passage"("corpusId", "orderIndex");

-- CreateIndex
CREATE INDEX "Passage_divisionId_idx" ON "Passage"("divisionId");

-- CreateIndex
CREATE INDEX "Passage_corpusId_sourceReference_idx" ON "Passage"("corpusId", "sourceReference");

-- CreateIndex
CREATE INDEX "PassageWitness_sourceId_idx" ON "PassageWitness"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "PassageWitness_passageId_sourceId_key" ON "PassageWitness"("passageId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Transliteration_passageId_scheme_key" ON "Transliteration"("passageId", "scheme");

-- CreateIndex
CREATE UNIQUE INDEX "Translator_slug_key" ON "Translator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Source_slug_key" ON "Source"("slug");

-- CreateIndex
CREATE INDEX "Translation_passageId_language_idx" ON "Translation"("passageId", "language");

-- CreateIndex
CREATE INDEX "Translation_visibility_status_idx" ON "Translation"("visibility", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");

-- CreateIndex
CREATE INDEX "StoryReference_passageId_idx" ON "StoryReference"("passageId");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Figure_slug_key" ON "Figure"("slug");

