"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrisma = getPrisma;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
let prisma = null;
const defaultDatabaseUrl = 'postgresql://rp:secret@localhost:5432/repopilot?schema=public';
/**
 * Singleton Prisma client for the API process.
 *
 * Phase 1 already uses Prisma with a driver adapter (Prisma 7).
 * Phase 2 extends the schema with repository/file/symbol/import/export tables.
 */
function getPrisma() {
    if (prisma)
        return prisma;
    const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
    const pool = new pg_1.Pool({ connectionString: databaseUrl });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    prisma = new client_1.PrismaClient({ adapter });
    return prisma;
}
