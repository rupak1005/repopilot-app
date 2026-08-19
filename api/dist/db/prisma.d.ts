import { PrismaClient } from '@prisma/client';
/**
 * Singleton Prisma client for the API process.
 *
 * Phase 1 already uses Prisma with a driver adapter (Prisma 7).
 * Phase 2 extends the schema with repository/file/symbol/import/export tables.
 */
export declare function getPrisma(): PrismaClient;
