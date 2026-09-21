import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const report = {
  generatedAt: new Date().toISOString().slice(0, 10),
  status: "NO_PRODUCTION_REPLACEMENT",
  gretil: {
    mandalas: 10,
    suktas: 1028,
    mantras: 10552,
    valakhilya: "Maṇḍala 8 suktas 49–59 (Aufrecht continuous numbering)",
    licence: "CC BY-NC-SA 4.0",
    commercialUseAllowed: false,
  },
  productionSource: null,
  comparison: {
    canonicalRefsInBoth: 0,
    onlyGretil: 10552,
    onlyProductionSource: 0,
    textuallyDifferentRecords: 0,
    note: "No commercially compatible machine-readable Sanskrit replacement was imported. GRETIL remains the only ingested Sanskrit witness.",
  },
  sampleInspection: [
    "RV.1.1.1",
    "RV.3.33.1",
    "RV.10.10.1",
    "RV.10.90.1",
    "RV.10.95.1",
    "RV.10.129.1",
  ].map((ref) => ({
    ref,
    gretil: "present (GRETIL witness)",
    productionSource: "not imported",
  })),
};

async function main() {
  const outDir = join(process.cwd(), "data/reports");
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, "rigveda-source-comparison.json");
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`Wrote ${path}`);
  console.log(report.comparison.note);
  if (existsSync(join(process.cwd(), "data/raw/rigveda/sa_Rgveda-edAufrecht.xml"))) {
    console.log("GRETIL raw XML retained.");
  }
}

main();
