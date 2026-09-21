import { importRigveda } from "../scripts/import-rigveda";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const report = await importRigveda();
  console.log("Seed complete", report);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
