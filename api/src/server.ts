import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  handleGitHubWebhook,
  verifyGitHubSignature
} from './services/githubWebhook';
import {
  getModuleDependencyTraversal,
  getSymbolDependencyTraversal
} from './services/dependencyGraphQueries';
import {
  getRepositoryRevisionStatus,
  listRepositoryRevisions
} from './services/repositoryRevisions';
import { askCodebaseQuestion } from './services/codebaseQa';
import { searchRepository } from './services/searchIndex';
import {
  getPullRequestDetails,
  listPullRequests,
  triggerPullRequestReview
} from './services/prReview';
import {
  getRepositoryAnalytics,
  listReviewHistory
} from './services/repositoryAnalytics';
import { ingestRepositoryHistory } from './services/historyIngest';
import {
  findSimilarChanges,
  getArchitectureGraph,
  getCoChanges,
  getSymbolChangeHistory,
  listModuleHotspots,
  searchHistory
} from './services/engineeringIntelligence';

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
  type ParsedJsonBody = {
    rawBody: string;
    json: unknown;
  };

  const server = Fastify({
    logger: {
      level: 'info'
    }
  });

  function parseCorsOrigins(): boolean | string[] {
    const raw = process.env.CORS_ORIGINS?.trim();
    if (!raw || raw === '*') return true;
    return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
  }

  await server.register(cors, { origin: parseCorsOrigins() });
  server.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (request, body, done) => {
      try {
        const rawBody = typeof body === 'string' ? body : body.toString('utf8');
        const json = rawBody ? JSON.parse(rawBody) : null;
        done(null, { rawBody, json });
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  await server.register(fastifyEnv, {
    dotenv: true,
    schema: {
      type: 'object',
      required: ['DATABASE_URL'],
      properties: {
        PORT: { type: 'string', default: '3001' },
        DATABASE_URL: { type: 'string' },
        REDIS_URL: { type: 'string' },
        REDIS_HOST: { type: 'string' },
        REDIS_PORT: { type: 'string' },
        REDIS_PASSWORD: { type: 'string' },
        REDIS_TLS: { type: 'string' },
        CORS_ORIGINS: { type: 'string' },
        GITHUB_WEBHOOK_SECRET: { type: 'string' }
      }
    }
  });

  if (!process.env.REDIS_URL && (!process.env.REDIS_HOST || !process.env.REDIS_PORT)) {
    throw new Error('Set REDIS_URL or both REDIS_HOST and REDIS_PORT');
  }

  // Connectivity checks (so `docker compose up` can validate infrastructure quickly).
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined
      });

  server.get('/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();
      return { status: 'ok', postgres: true, redis: true };
    } catch (err) {
      server.log.error({ err }, 'Health check failed');
      reply.code(503);
      return { status: 'degraded', postgres: false, redis: false };
    }
  });

  server.get('/api/v1/repositories/:repoId/dependencies', async (request, reply) => {
    const params = request.params as { repoId: string };
    const query = request.query as {
      symbolId?: string;
      filePath?: string;
      revisionSha?: string;
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
        revisionSha: query.revisionSha,
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
        revisionSha: query.revisionSha,
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

  server.get('/api/v1/repositories/:repoId/revisions', async (request) => {
    const params = request.params as { repoId: string };
    return listRepositoryRevisions(params.repoId);
  });

  server.get('/api/v1/repositories/:repoId/revisions/:sha', async (request, reply) => {
    const params = request.params as { repoId: string; sha: string };
    const result = await getRepositoryRevisionStatus({
      repositoryId: params.repoId,
      revisionSha: params.sha
    });

    if (!result) {
      reply.code(404);
      return { error: 'revision not found for repository' };
    }

    return result;
  });

  server.post('/api/v1/repositories/:repoId/search', async (request, reply) => {
    const params = request.params as { repoId: string };
    const body = ((request.body as ParsedJsonBody | undefined)?.json ?? {}) as {
      query?: string;
      topK?: number;
      revisionSha?: string;
    };

    if (!body.query || !body.query.trim()) {
      reply.code(400);
      return { error: 'query is required' };
    }

    const topK = body.topK ? Number(body.topK) : undefined;
    if (topK !== undefined && (!Number.isFinite(topK) || topK < 1)) {
      reply.code(400);
      return { error: 'topK must be a positive integer' };
    }

    return searchRepository({
      repositoryId: params.repoId,
      query: body.query,
      topK,
      revisionSha: body.revisionSha
    });
  });

  server.post('/api/v1/repositories/:repoId/ask', async (request, reply) => {
    const params = request.params as { repoId: string };
    const body = ((request.body as ParsedJsonBody | undefined)?.json ?? {}) as {
      query?: string;
      revisionSha?: string;
    };

    if (!body.query || !body.query.trim()) {
      reply.code(400);
      return { error: 'query is required' };
    }

    return askCodebaseQuestion({
      repositoryId: params.repoId,
      query: body.query,
      revisionSha: body.revisionSha
    });
  });

  server.get('/api/v1/repositories/:repoId/pulls', async (request) => {
    const params = request.params as { repoId: string };
    return listPullRequests(params.repoId);
  });

  server.get('/api/v1/repositories/:repoId/pulls/:number', async (request, reply) => {
    const params = request.params as { repoId: string; number: string };
    const pullNumber = Number(params.number);
    if (!Number.isFinite(pullNumber) || pullNumber < 1) {
      reply.code(400);
      return { error: 'pull number must be a positive integer' };
    }

    const result = await getPullRequestDetails({
      repositoryId: params.repoId,
      pullNumber
    });
    if (!result) {
      reply.code(404);
      return { error: 'pull request not found' };
    }

    return result;
  });

  server.post('/api/v1/repositories/:repoId/pulls/:number/review', async (request, reply) => {
    const params = request.params as { repoId: string; number: string };
    const body = ((request.body as ParsedJsonBody | undefined)?.json ?? {}) as {
      force?: boolean;
      sync?: boolean;
    };
    const pullNumber = Number(params.number);
    if (!Number.isFinite(pullNumber) || pullNumber < 1) {
      reply.code(400);
      return { error: 'pull number must be a positive integer' };
    }

    try {
      return await triggerPullRequestReview({
        repositoryId: params.repoId,
        pullNumber,
        force: body.force === true,
        sync: body.sync === true
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'pull request not found') {
        reply.code(404);
        return { error: 'pull request not found' };
      }
      throw err;
    }
  });

  server.get('/api/v1/repositories/:repoId/reviews/history', async (request) => {
    const params = request.params as { repoId: string };
    const query = request.query as { pullNumber?: string };
    const pullNumber = query.pullNumber ? Number(query.pullNumber) : undefined;

    return listReviewHistory({
      repositoryId: params.repoId,
      pullNumber: Number.isFinite(pullNumber) ? pullNumber : undefined
    });
  });

  server.get('/api/v1/repositories/:repoId/analytics', async (request) => {
    const params = request.params as { repoId: string };
    return getRepositoryAnalytics(params.repoId);
  });

  server.post('/api/v1/repositories/:repoId/history/ingest', async (request, reply) => {
    const params = request.params as { repoId: string };
    const body = ((request.body as ParsedJsonBody | undefined)?.json ?? {}) as {
      repoPath?: string;
      rebuild?: boolean;
      maxCount?: number;
    };

    let repoPath = body.repoPath;
    if (!repoPath) {
      const cloneRoot = process.env.REPO_CLONE_ROOT;
      if (!cloneRoot) {
        reply.code(400);
        return { error: 'repoPath is required (or set REPO_CLONE_ROOT with indexed repository metadata)' };
      }

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const rows = (await pool.query(
        'SELECT "owner", "name" FROM "Repository" WHERE "id" = $1 LIMIT 1',
        [params.repoId]
      )) as { rows: Array<{ owner: string; name: string }> };
      await pool.end();
      const meta = rows.rows[0];
      if (!meta) {
        reply.code(404);
        return { error: 'repository not found' };
      }
      repoPath = `${cloneRoot}/${meta.owner}/${meta.name}`;
    }

    return ingestRepositoryHistory({
      repositoryId: params.repoId,
      repoPath,
      rebuild: body.rebuild === true,
      maxCount: body.maxCount
    });
  });

  server.get('/api/v1/repositories/:repoId/hotspots', async (request) => {
    const params = request.params as { repoId: string };
    const query = request.query as { topK?: string };
    const topK = query.topK ? Number(query.topK) : undefined;

    return listModuleHotspots({
      repositoryId: params.repoId,
      topK
    });
  });

  server.get('/api/v1/repositories/:repoId/co-change', async (request, reply) => {
    const params = request.params as { repoId: string };
    const query = request.query as { file?: string; topK?: string };

    if (!query.file) {
      reply.code(400);
      return { error: 'file query parameter is required' };
    }

    const topK = query.topK ? Number(query.topK) : undefined;
    return getCoChanges({
      repositoryId: params.repoId,
      filePath: query.file,
      topK
    });
  });

  server.post('/api/v1/repositories/:repoId/search/history', async (request, reply) => {
    const params = request.params as { repoId: string };
    const body = ((request.body as ParsedJsonBody | undefined)?.json ?? {}) as {
      query?: string;
      type?: 'commit' | 'pull_request' | 'all';
      topK?: number;
    };

    if (!body.query?.trim()) {
      reply.code(400);
      return { error: 'query is required' };
    }

    return searchHistory({
      repositoryId: params.repoId,
      query: body.query,
      type: body.type,
      topK: body.topK
    });
  });

  server.get('/api/v1/repositories/:repoId/similar-changes', async (request, reply) => {
    const params = request.params as { repoId: string };
    const query = request.query as { pullNumber?: string; topK?: string };
    const pullNumber = query.pullNumber ? Number(query.pullNumber) : NaN;

    if (!Number.isFinite(pullNumber) || pullNumber < 1) {
      reply.code(400);
      return { error: 'pullNumber query parameter is required' };
    }

    return findSimilarChanges({
      repositoryId: params.repoId,
      pullNumber,
      topK: query.topK ? Number(query.topK) : undefined
    });
  });

  server.get('/api/v1/repositories/:repoId/architecture', async (request) => {
    const params = request.params as { repoId: string };
    const query = request.query as { revisionSha?: string };

    return getArchitectureGraph({
      repositoryId: params.repoId,
      revisionSha: query.revisionSha
    });
  });

  server.get('/api/v1/repositories/:repoId/symbols/:name/history', async (request) => {
    const params = request.params as { repoId: string; name: string };
    const query = request.query as { topK?: string };

    return getSymbolChangeHistory({
      repositoryId: params.repoId,
      symbolName: params.name,
      topK: query.topK ? Number(query.topK) : undefined
    });
  });

  server.post('/webhook', async (request, reply) => {
    const body = request.body as ParsedJsonBody | undefined;
    const rawBody = body?.rawBody ?? '';
    const signature = request.headers['x-hub-signature-256'];
    const event = request.headers['x-github-event'];
    const deliveryId = request.headers['x-github-delivery'];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
      reply.code(500);
      return { error: 'GITHUB_WEBHOOK_SECRET is not configured' };
    }

    if (typeof signature !== 'string' || !verifyGitHubSignature({ rawBody, signatureHeader: signature, secret })) {
      server.log.warn({ event: 'webhook.invalid_signature' }, 'Invalid webhook signature');
      reply.code(401);
      return { error: 'invalid signature' };
    }

    if (typeof event !== 'string' || typeof deliveryId !== 'string') {
      reply.code(400);
      return { error: 'missing required webhook headers' };
    }

    try {
      const result = await handleGitHubWebhook({
        event,
        deliveryId,
        rawBody
      });

      server.log.info(
        {
          event: event === 'pull_request' ? 'pr.received' : 'repo.push',
          githubEvent: event,
          deliveryId,
          duplicate: result.duplicate,
          repositoryId: result.repositoryId,
          queuedJobId: result.queuedJobId
        },
        'Webhook received'
      );

      return {
        ok: true,
        duplicate: result.duplicate,
        queuedJobId: result.queuedJobId
      };
    } catch (err) {
      server.log.error({ err, deliveryId, githubEvent: event }, 'Webhook processing failed');
      reply.code(500);
      return { error: 'webhook processing failed' };
    }
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

