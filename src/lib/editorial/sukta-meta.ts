import { readFileSync } from "node:fs";
import { join } from "node:path";

export type SuktaMeta = {
  mandala: number;
  sukta: number;
  title: string;
  kind?: string;
  context?: string;
  themes?: string[];
};

let cached: SuktaMeta[] | null = null;

export function loadSuktaMeta(): SuktaMeta[] {
  if (cached) return cached;
  const path = join(process.cwd(), "data/editorial/sukta-titles.json");
  cached = JSON.parse(readFileSync(path, "utf8")) as SuktaMeta[];
  return cached;
}

export function getSuktaMeta(mandala: string | number, sukta: string | number) {
  return (
    loadSuktaMeta().find(
      (row) =>
        row.mandala === Number(mandala) && row.sukta === Number(sukta),
    ) ?? null
  );
}
