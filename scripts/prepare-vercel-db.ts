import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const databasePath = join(process.cwd(), "prisma", "dev.db");
const env = { ...process.env, DATABASE_URL: "file:./dev.db" };

if (!existsSync(databasePath)) {
  execFileSync(
    "npx",
    [
      "prisma",
      "db",
      "execute",
      "--file",
      "prisma/migrations/20260921100000_init/migration.sql",
      "--schema",
      "prisma/schema.prisma",
    ],
    { env, stdio: "inherit" },
  );
}

execFileSync("npm", ["run", "db:import"], { env, stdio: "inherit" });
execFileSync("npm", ["run", "db:import:griffith"], { env, stdio: "inherit" });
