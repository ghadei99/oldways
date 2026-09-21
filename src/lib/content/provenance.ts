export type ProvenanceIssue = {
  kind: "passage" | "translation" | "preferred_source";
  id: string;
  reference?: string;
  message: string;
};

export type PassageProvenanceInput = {
  id: string;
  canonicalReference: string;
  originalText: string;
  displayed: boolean;
  textSource: {
    slug: string;
    licence: string | null;
    copyrightStatus: string;
    visibility: string;
    commercialUseAllowed: boolean;
  } | null;
};

export type TranslationProvenanceInput = {
  id: string;
  language: string;
  visibility: string;
  status: string;
  isDemo: boolean;
  translatorId: string | null;
  sourceId: string | null;
  historicalWorkId?: string | null;
  copyrightStatus: string | null;
  source: { licence: string | null; copyrightStatus: string } | null;
};

export type PreferredSourceInput = {
  slug: string;
  exists: boolean;
  visibility?: string;
  licence?: string | null;
  copyrightStatus?: string;
  commercialUseAllowed?: boolean;
};

export function validateProductionProvenance(input: {
  passages: PassageProvenanceInput[];
  translations: TranslationProvenanceInput[];
  preferredSource?: PreferredSourceInput;
  commercialBuild?: boolean;
}): ProvenanceIssue[] {
  const issues: ProvenanceIssue[] = [];
  const commercial = Boolean(input.commercialBuild);

  if (input.preferredSource) {
    const preferred = input.preferredSource;
    if (!preferred.exists) {
      issues.push({
        kind: "preferred_source",
        id: preferred.slug,
        message: "preferred Sanskrit source does not exist",
      });
    } else {
      if (preferred.visibility && preferred.visibility === "HIDDEN") {
        issues.push({
          kind: "preferred_source",
          id: preferred.slug,
          message: "preferred Sanskrit source is hidden",
        });
      }
      if (!preferred.licence && !preferred.copyrightStatus) {
        issues.push({
          kind: "preferred_source",
          id: preferred.slug,
          message: "preferred Sanskrit source lacks provenance",
        });
      }
      if (commercial && preferred.commercialUseAllowed === false) {
        issues.push({
          kind: "preferred_source",
          id: preferred.slug,
          message:
            "COMMERCIAL_BUILD forbids a preferred Sanskrit source with commercialUseAllowed=false",
        });
      }
      if (
        commercial &&
        preferred.visibility &&
        preferred.visibility !== "PRODUCTION"
      ) {
        issues.push({
          kind: "preferred_source",
          id: preferred.slug,
          message:
            "COMMERCIAL_BUILD requires a production-visible preferred Sanskrit source",
        });
      }
    }
  }

  for (const passage of input.passages) {
    if (!passage.displayed) continue;
    if (!passage.originalText.trim()) continue;
    if (!passage.textSource) {
      issues.push({
        kind: "passage",
        id: passage.id,
        reference: passage.canonicalReference,
        message: "production-visible original text has no source",
      });
      continue;
    }
    if (!passage.textSource.slug) {
      issues.push({
        kind: "passage",
        id: passage.id,
        reference: passage.canonicalReference,
        message: "production-visible original text has no source identifier",
      });
    }
    if (!passage.textSource.licence && !passage.textSource.copyrightStatus) {
      issues.push({
        kind: "passage",
        id: passage.id,
        reference: passage.canonicalReference,
        message: "production-visible original text lacks licence/copyright status",
      });
    }
    if (!passage.textSource.visibility) {
      issues.push({
        kind: "passage",
        id: passage.id,
        reference: passage.canonicalReference,
        message: "production-visible original text lacks visibility",
      });
    }
    if (typeof passage.textSource.commercialUseAllowed !== "boolean") {
      issues.push({
        kind: "passage",
        id: passage.id,
        reference: passage.canonicalReference,
        message: "production-visible original text lacks commercial-use metadata",
      });
    }
    if (commercial && passage.textSource.commercialUseAllowed === false) {
      issues.push({
        kind: "passage",
        id: passage.id,
        reference: passage.canonicalReference,
        message:
          "COMMERCIAL_BUILD cannot publish original text from a non-commercial source",
      });
    }
  }

  for (const translation of input.translations) {
    if (translation.visibility !== "PRODUCTION" || translation.isDemo) continue;
    if (!translation.language) {
      issues.push({
        kind: "translation",
        id: translation.id,
        message: "production-visible translation has no language",
      });
    }
    if (!translation.translatorId) {
      issues.push({
        kind: "translation",
        id: translation.id,
        message: "production-visible translation has no translator or editorial owner",
      });
    }
    if (!translation.sourceId) {
      issues.push({
        kind: "translation",
        id: translation.id,
        message: "production-visible translation has no digital source",
      });
    }
    if (!translation.status) {
      issues.push({
        kind: "translation",
        id: translation.id,
        message: "production-visible translation has no status",
      });
    }
    if (!translation.visibility) {
      issues.push({
        kind: "translation",
        id: translation.id,
        message: "production-visible translation has no visibility",
      });
    }
    const licence = translation.source?.licence;
    const copyright =
      translation.copyrightStatus || translation.source?.copyrightStatus;
    if (!licence && !copyright) {
      issues.push({
        kind: "translation",
        id: translation.id,
        message: "production-visible translation lacks copyright/licence status",
      });
    }
  }

  return issues;
}
