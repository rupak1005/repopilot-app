import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient | null = null;

const defaultDatabaseUrl =
  'postgresql://rp:secret@localhost:5432/repopilot?schema=public';

/** ponytail: Neon pooler latency; default Prisma 5s interactive tx is too tight */
export const prismaInteractiveTxOptions = {
  maxWait: Number(process.env.PRISMA_TX_MAX_WAIT_MS ?? 30_000),
  timeout: Number(process.env.PRISMA_TX_TIMEOUT_MS ?? 120_000)
} as const;

/** Singleton Prisma client for the API process (Prisma 7 driver adapter). */
export function getPrisma(): PrismaClient {
  if (prisma) return prisma;

  const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  prisma = new PrismaClient({ adapter });
  return prisma;
}

