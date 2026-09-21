import { PrismaClient } from "@prisma/client";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const vercelDatabaseUrl = process.env.VERCEL
  ? `file:${path.join(process.cwd(), "prisma", "dev.db")}`
  : undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    vercelDatabaseUrl
      ? { datasources: { db: { url: vercelDatabaseUrl } } }
      : undefined,
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
