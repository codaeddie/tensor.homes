/**
 * Prisma client singleton.
 *
 * Provides a single PrismaClient instance to prevent connection pool exhaustion
 * in development (hot reloading). Uses custom output path: app/generated/prisma
 */

import { PrismaClient } from "@/app/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
