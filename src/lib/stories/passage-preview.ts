import {
  isProductionVisibleTranslation,
  sanskritSourceAllowedInCurrentMode,
} from "@/lib/content/visibility";
import { formatReference, passageHref } from "@/lib/references";

export type PreviewTranslation = {
  language: string;
  text: string;
  isDemo: boolean;
  visibility: string;
  status: string;
  translatorName: string | null;
};

export type PreviewPassage = {
  canonicalReference: string;
  originalText: string;
  sourceText: string | null;
  iast: string | null;
  textSource: {
    visibility: string;
    commercialUseAllowed: boolean;
  } | null;
  translations: PreviewTranslation[];
};

export type PassagePreview = {
  compact: string;
  display: string;
  href: string;
  iast: string | null;
  originalText: string | null;
  sanskritWithheld: boolean;
  english: {
    text: string;
    translatorName: string | null;
    isDevelopment: boolean;
  } | null;
  englishUnavailable: boolean;
};

const UNAVAILABLE =
  "English translation unavailable in the current verified corpus.";

export function selectStoryEnglish(
  translations: PreviewTranslation[],
  includeDevelopment: boolean,
) {
  const english = translations.filter((t) => t.language === "en");
  const production = english.find((t) => isProductionVisibleTranslation(t));
  if (production) {
    return {
      text: production.text,
      translatorName: production.translatorName,
      isDevelopment: false,
    };
  }
  if (includeDevelopment) {
    const development = english[0];
    if (development) {
      return {
        text: development.text,
        translatorName: development.translatorName,
        isDevelopment: true,
      };
    }
  }
  return null;
}

export function buildPassagePreview(
  passage: PreviewPassage,
  options: { includeSanskrit: boolean; includeDevelopment: boolean },
): PassagePreview {
  const compact = passage.canonicalReference;
  const sourceAllowed = passage.textSource
    ? sanskritSourceAllowedInCurrentMode(passage.textSource)
    : false;
  const showSanskrit = options.includeSanskrit && sourceAllowed;
  const english = selectStoryEnglish(
    passage.translations,
    options.includeDevelopment,
  );
  return {
    compact,
    display: formatReference(compact),
    href: passageHref(compact),
    iast: showSanskrit ? passage.iast : null,
    originalText: showSanskrit ? passage.originalText || null : null,
    sanskritWithheld: Boolean(passage.originalText) && !showSanskrit,
    english,
    englishUnavailable: !english,
  };
}

export function unavailableEnglishMessage() {
  return UNAVAILABLE;
}
