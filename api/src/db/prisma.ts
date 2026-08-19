import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient | null = null;

const defaultDatabaseUrl =
  'postgresql://rp:secret@localhost:5432/repopilot?schema=public';

/**
 * Singleton Prisma client for the API process.
 *
 * Phase 1 already uses Prisma with a driver adapter (Prisma 7).
 * Phase 2 extends the schema with repository/file/symbol/import/export tables.
 */
export function getPrisma(): PrismaClient {
  if (prisma) return prisma;

  const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  prisma = new PrismaClient({ adapter });
  return prisma;
}

