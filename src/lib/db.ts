import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient per process. Next.js dev reloads modules on every edit,
 * so without the global cache each reload would open a new pool until Postgres
 * refused connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
