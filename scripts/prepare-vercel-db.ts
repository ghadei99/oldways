import { execFileSync } from "node:child_process";

const env = { ...process.env, DATABASE_URL: "file:./dev.db" };

execFileSync("npx", ["prisma", "migrate", "deploy"], { env, stdio: "inherit" });

execFileSync("npm", ["run", "db:import"], { env, stdio: "inherit" });
execFileSync("npm", ["run", "db:import:griffith"], { env, stdio: "inherit" });
execFileSync("npm", ["run", "translate:validate"], { env, stdio: "inherit" });
execFileSync("npm", ["run", "translate:import"], { env, stdio: "inherit" });
