import Fastify from 'fastify';
import cors from 'fastify-cors';
import fastifyEnv from '@fastify/env';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  getModuleDependencyTraversal,
  getSymbolDependencyTraversal
} from './services/dependencyGraphQueries';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries<T>(
  fn: () => Promise<T>,
  attempts = 10,
  delayMs = 2000
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

async function bootstrap() {
  const server = Fastify({
    logger: {
      level: 'info'
    }
  });

  // Keep Phase 1 intentionally small: wire CORS and validate required env upfront.
  await server.register(cors, { origin: true });

  await server.register(fastifyEnv, {
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

  server.get('/api/v1/repositories/:repoId/dependencies', async (request, reply) => {
    const params = request.params as { repoId: string };
    const query = request.query as {
      symbolId?: string;
      filePath?: string;
      depth?: string;
    };
    const depth = query.depth ? Number(query.depth) : undefined;

    if (query.depth && (!Number.isFinite(depth) || Number(depth) < 1)) {
      reply.code(400);
      return {
        error: 'depth must be a positive integer'
      };
    }

    if (query.symbolId) {
      const result = await getSymbolDependencyTraversal({
        repositoryId: params.repoId,
        symbolId: query.symbolId,
        depthLimit: depth
      });
      if (!result) {
        reply.code(404);
        return { error: 'symbol not found for repository' };
      }
      return result;
    }

    if (query.filePath) {
      const result = await getModuleDependencyTraversal({
        repositoryId: params.repoId,
        filePath: query.filePath,
        depthLimit: depth
      });
      if (!result) {
        reply.code(404);
        return { error: 'file not found for repository' };
      }
      return result;
    }

    reply.code(400);
    return {
      error: 'one of symbolId or filePath is required'
    };
  });

  // Connectivity checks (so `docker compose up` can validate infrastructure quickly).
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  });

  try {
    await withRetries(async () => {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    });

    await withRetries(async () => {
      await redis.ping();
      return true;
    });

    server.log.info(
      { event: 'infrastructure.ready' },
      'Connected to Postgres (Prisma) and Redis'
    );
  } catch (err) {
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

