export const VISIBILITY = {
  PRODUCTION: "PRODUCTION",
  DEVELOPMENT: "DEVELOPMENT",
  HIDDEN: "HIDDEN",
} as const;

export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];

export const TRANSLATION_STATUS = {
  VERIFIED_PUBLISHED: "VERIFIED_PUBLISHED",
  LICENSED: "LICENSED",
  PUBLIC_DOMAIN: "PUBLIC_DOMAIN",
  WORKING_TRANSLATION: "WORKING_TRANSLATION",
  MACHINE_ASSISTED: "MACHINE_ASSISTED",
  EDITORIAL: "EDITORIAL",
  UNVERIFIED: "UNVERIFIED",
} as const;

export type TranslationStatus =
  (typeof TRANSLATION_STATUS)[keyof typeof TRANSLATION_STATUS];

export const PRODUCTION_TRANSLATION_STATUSES = new Set<string>([
  TRANSLATION_STATUS.VERIFIED_PUBLISHED,
  TRANSLATION_STATUS.LICENSED,
  TRANSLATION_STATUS.PUBLIC_DOMAIN,
  TRANSLATION_STATUS.MACHINE_ASSISTED,
  TRANSLATION_STATUS.EDITORIAL,
]);

export const GRETIL_SOURCE_SLUG = "gretil-aufrecht-2019";

export const OBSOLETE_SOURCE_SLUGS = [
  "rv-sanskrit-seed",
  "griffith-1896",
] as const;

export function preferredSanskritSourceSlug() {
  return process.env.PREFERRED_SANSKRIT_SOURCE ?? GRETIL_SOURCE_SLUG;
}

export function isCommercialBuild() {
  const value = process.env.COMMERCIAL_BUILD;
  return value === "1" || value === "true";
}

export function includeDevelopmentContent() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.SHOW_DEMO_TRANSLATIONS === "1"
  );
}

/** Research encodings such as GRETIL may be shown in development, or with an explicit opt-in. */
export function includeResearchSanskrit() {
  if (isCommercialBuild()) return false;
  return (
    includeDevelopmentContent() || process.env.ALLOW_RESEARCH_SANSKRIT === "1"
  );
}

export function sanskritSourceAllowedInCurrentMode(source: {
  visibility: string;
  commercialUseAllowed: boolean;
}) {
  if (source.visibility === VISIBILITY.HIDDEN) return false;
  if (isCommercialBuild()) {
    return (
      source.visibility === VISIBILITY.PRODUCTION && source.commercialUseAllowed
    );
  }
  if (includeResearchSanskrit()) {
    return true;
  }
  return source.visibility === VISIBILITY.PRODUCTION;
}

export function isProductionVisibleTranslation(row: {
  visibility: string;
  status: string;
  isDemo: boolean;
}) {
  if (row.isDemo) return false;
  if (row.visibility !== VISIBILITY.PRODUCTION) return false;
  return PRODUCTION_TRANSLATION_STATUSES.has(row.status);
}

export function translationWhere(includeDevelopment: boolean) {
  if (includeDevelopment) {
    return { visibility: { not: VISIBILITY.HIDDEN } };
  }
  return {
    visibility: VISIBILITY.PRODUCTION,
    isDemo: false,
    status: { in: [...PRODUCTION_TRANSLATION_STATUSES] },
  };
}

export function isObsoleteSourceSlug(slug: string) {
  return (OBSOLETE_SOURCE_SLUGS as readonly string[]).includes(slug);
}
