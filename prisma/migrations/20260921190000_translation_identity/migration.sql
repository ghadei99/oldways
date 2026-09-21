CREATE UNIQUE INDEX "Translation_passageId_language_translatorId_key"
ON "Translation"("passageId", "language", "translatorId");
