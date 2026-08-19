"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const fastify_cors_1 = __importDefault(require("fastify-cors"));
const env_1 = __importDefault(require("@fastify/env"));
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetries(fn, attempts = 10, delayMs = 2000) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (err) {
            lastErr = err;
            await sleep(delayMs);
        }
    }
    throw lastErr;
}
async function bootstrap() {
    const server = (0, fastify_1.default)({
        logger: {
            level: 'info'
        }
    });
    // Keep Phase 1 intentionally small: wire CORS and validate required env upfront.
    await server.register(fastify_cors_1.default, { origin: true });
    await server.register(env_1.default, {
        dotenv: true,
        schema: {
            type: 'object',
            required: ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT'],
            properties: {
                PORT: { type: 'string', default: '3001' },
                DATABASE_URL: { type: 'string' },
                REDIS_HOST: { type: 'string' },
                REDIS_PORT: { type: 'string' }
            }
        }
    });
    server.get('/health', async () => ({ status: 'ok' }));
    // Connectivity checks (so `docker compose up` can validate infrastructure quickly).
    const pool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL
    });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    const prisma = new client_1.PrismaClient({ adapter });
    const redis = new ioredis_1.default({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
    });
    try {
        await withRetries(async () => {
            await prisma.$connect();
            await prisma.$queryRaw `SELECT 1`;
            return true;
        });
        await withRetries(async () => {
            await redis.ping();
            return true;
        });
        server.log.info({ event: 'infrastructure.ready' }, 'Connected to Postgres (Prisma) and Redis');
    }
    catch (err) {
        server.log.error({ err }, 'Infrastructure connectivity check failed');
        throw err;
    }
    const port = Number(process.env.PORT ?? 3001);
    // Clean shutdown: Prisma + Redis.
    const shutdown = async () => {
        server.log.info({ event: 'shutdown.start' }, 'Shutting down');
        await redis.quit();
        await prisma.$disconnect();
        await pool.end();
        await server.close();
    };
    process.on('SIGINT', () => shutdown().catch(() => undefined));
    process.on('SIGTERM', () => shutdown().catch(() => undefined));
    await server.listen({ port, host: '0.0.0.0' });
}
bootstrap().catch((err) => {
    // Fastify logger may not be fully ready if bootstrap fails early.
    console.error(err);
    process.exit(1);
});
