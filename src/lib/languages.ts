export const LANGUAGES = [
  { id: "sa", label: "Sanskrit", native: "संस्कृतम्", script: "deva" },
  { id: "en", label: "English", native: "English", script: "latn" },
  { id: "hi", label: "Hindi", native: "हिन्दी", script: "deva" },
  { id: "or", label: "Odia", native: "ଓଡ଼ିଆ", script: "orya" },
  { id: "bn", label: "Bengali", native: "বাংলা", script: "beng" },
] as const;

export type LangId = (typeof LANGUAGES)[number]["id"];

export const TRANSLATION_LANGS = LANGUAGES.filter((l) => l.id !== "sa");

export function languageLabel(id: string) {
  return LANGUAGES.find((l) => l.id === id)?.native ?? id;
}
