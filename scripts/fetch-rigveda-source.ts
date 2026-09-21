import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dest = join(process.cwd(), "data/raw/rigveda/sa_Rgveda-edAufrecht.xml");
const url =
  "https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_Rgveda-edAufrecht.xml";

async function main() {
  mkdirSync(join(process.cwd(), "data/raw/rigveda"), { recursive: true });
  if (existsSync(dest) && process.argv.includes("--skip-if-present")) {
    console.log("Already present:", dest);
    return;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed ${res.status} ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log("Wrote", dest, buf.length, "bytes");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
