export const EDITORIAL_LANGUAGES = ["hi", "or", "bn"] as const;
export const EDITORIAL_STATUSES = ["MACHINE_ASSISTED", "EDITORIAL"] as const;

export type EditorialLanguage = (typeof EDITORIAL_LANGUAGES)[number];
export type EditorialTranslationRow = {
  ref: string;
  language: EditorialLanguage;
  text: string;
  status: (typeof EDITORIAL_STATUSES)[number];
};

export function parseEditorialJsonl(input: string) {
  const rows: EditorialTranslationRow[] = [];
  const errors: string[] = [];
  const keys = new Set<string>();
  for (const [index, line] of input.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let value: Partial<EditorialTranslationRow>;
    try {
      value = JSON.parse(line) as Partial<EditorialTranslationRow>;
    } catch {
      errors.push(`line ${index + 1}: invalid JSON`);
      continue;
    }
    if (!/^RV\.\d+\.\d+\.\d+$/.test(value.ref ?? "")) {
      errors.push(`line ${index + 1}: invalid canonical ref`);
    }
    if (!EDITORIAL_LANGUAGES.includes(value.language as EditorialLanguage)) {
      errors.push(`line ${index + 1}: language must be hi, or, or bn`);
    }
    if (!EDITORIAL_STATUSES.includes(value.status as EditorialTranslationRow["status"])) {
      errors.push(`line ${index + 1}: invalid editorial status`);
    }
    const text = value.text?.trim() ?? "";
    if (text.length < 8 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f�]/.test(text)) {
      errors.push(`line ${index + 1}: empty, too short, or malformed text`);
    }
    if (/^[\x00-\x7F\s\p{P}]+$/u.test(text)) {
      errors.push(`line ${index + 1}: Indic translation appears ASCII-only`);
    }
    const key = `${value.ref}:${value.language}`;
    if (keys.has(key)) errors.push(`line ${index + 1}: duplicate ${key}`);
    keys.add(key);
    if (value.ref && value.language && value.status && text) {
      rows.push({
        ref: value.ref,
        language: value.language as EditorialLanguage,
        status: value.status as EditorialTranslationRow["status"],
        text,
      });
    }
  }
  return { rows, errors };
}
