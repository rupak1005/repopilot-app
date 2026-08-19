import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { deriveRepositoryId } from '@repopilot/common';
import {
  handleGitHubWebhook,
  verifyGitHubSignature
} from './services/githubWebhook';
import { fetchPublicRepositoryMeta, searchPublicRepositories } from './services/githubPublic';
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
import {
  expandContext,
  parseContextGraphView
} from './services/contextGraph';
import { analyzeFileImpact } from './services/impactAnalysis';
import { requireInternalApiAuth } from './middleware/internalAuth';
import { checkRateLimit, clientIp } from './middleware/rateLimit';
import {
  getRepositoryIndexStatus,
  rebuildRepositoryGraph,
  startPublicRepositoryIndex,
  startRepositoryIndex
} from './services/repositoryIndex';

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

  server.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/v1/')) return;
    if (!requireInternalApiAuth(request, reply)) return;
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

  server.post('/api/v1/public/repositories/open', async (request, reply) => {
    const body = ((request.body as ParsedJsonBody | undefined)?.json ?? {}) as {
      owner?: string;
      name?: string;
      inline?: boolean;
      background?: boolean;
    };

    if (!body.owner?.trim() || !body.name?.trim()) {
      reply.code(400);
      return { error: 'owner and name are required' };
    }

    const owner = body.owner.trim();
    const name = body.name.trim();

    const ip = clientIp(request.headers as Record<string, unknown>, request.ip);
    const limit = checkRateLimit(`public-open:${ip}`, 12, 60 * 60 * 1000);
    if (!limit.allowed) {
      reply.code(429);
      return {
        error: `Too many public opens from this address. Try again in ${limit.retryAfterSec}s.`
      };
    }

    const meta = await fetchPublicRepositoryMeta({ owner, name });
    if (!meta) {
      reply.code(404);
      return {
        error: 'Repository not found or not public. Sign in with GitHub for private repositories.'
      };
    }

    const repositoryId = deriveRepositoryId(meta.fullName);
    try {
      const result = await startPublicRepositoryIndex({
        repositoryId,
        owner: meta.owner,
        name: meta.name,
        inline: body.inline,
        background: body.background
      });
      return {
        repositoryId,
        fullName: meta.fullName,
        description: meta.description,
        ...result
      };
    } catch (err) {
      server.log.error({ err, owner, name }, 'Public repository open failed');
      reply.code(500);
      return {
        error: err instanceof Error ? err.message : 'Failed to index public repository'
      };
    }
  });

  server.get('/api/v1/public/repositories/browse', async (request) => {
    const query = request.query as {
      q?: string;
      sort?: string;
      minStars?: string;
      page?: string;
    };
    const sort = query.sort === 'updated' ? 'updated' : 'stars';
    const minStars = query.minStars ? Number(query.minStars) : undefined;
    const page = query.page ? Number(query.page) : 1;

    return searchPublicRepositories({
      q: query.q,
      sort,
      minStars: Number.isFinite(minStars) ? minStars : undefined,
      page: Number.isFinite(page) ? page : 1
    });
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

  server.get('/api/v1/repositories/:repoId/index/status', async (request) => {
    const params = request.params as { repoId: string };
    return getRepositoryIndexStatus(params.repoId);
  });

  server.get('/api/v1/repositories/:repoId/index/stream', async (request, reply) => {
    const params = request.params as { repoId: string };
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    let closed = false;
    request.raw.on('close', () => {
      closed = true;
    });

    const emit = async (): Promise<void> => {
      if (closed) return;
      try {
        const status = await getRepositoryIndexStatus(params.repoId);
        reply.raw.write(`data: ${JSON.stringify(status)}\n\n`);
        if (status.state === 'ready' || status.state === 'failed') {
          reply.raw.end();
          return;
        }
        setTimeout(() => void emit(), 1500);
      } catch (err) {
        server.log.error({ err, repoId: params.repoId }, 'Index status stream failed');
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: 'stream_failed' })}\n\n`);
        reply.raw.end();
      }
    };

    await emit();
  });

  server.post('/api/v1/repositories/:repoId/graph/rebuild', async (request, reply) => {
    const params = request.params as { repoId: string };
    try {
      return await rebuildRepositoryGraph(params.repoId);
    } catch (err) {
      reply.code(400);
      return {
        error: err instanceof Error ? err.message : 'Failed to rebuild graph'
      };
    }
  });

  server.post('/api/v1/repositories/:repoId/index', async (request, reply) => {
    const params = request.params as { repoId: string };
    const body = ((request.body as ParsedJsonBody | undefined)?.json ?? {}) as {
      owner?: string;
      name?: string;
      accessToken?: string;
      inline?: boolean;
    };

    if (!body.owner || !body.name || !body.accessToken) {
      reply.code(400);
      return { error: 'owner, name, and accessToken are required' };
    }

    try {
      const result = await startRepositoryIndex({
        repositoryId: params.repoId,
        owner: body.owner,
        name: body.name,
        accessToken: body.accessToken,
        inline: body.inline
      });
      return result;
    } catch (err) {
      server.log.error({ err, repositoryId: params.repoId }, 'Index start failed');
      reply.code(500);
      return {
        error: err instanceof Error ? err.message : 'Failed to start repository index'
      };
    }
  });

  server.get('/api/v1/repositories/:repoId/impact', async (request, reply) => {
    const params = request.params as { repoId: string };
    const query = request.query as {
      filePath?: string;
      revisionSha?: string;
      depth?: string;
    };

    if (!query.filePath?.trim()) {
      reply.code(400);
      return { error: 'filePath is required' };
    }

    const depth = query.depth ? Number(query.depth) : undefined;
    if (query.depth && (!Number.isFinite(depth) || Number(depth) < 1)) {
      reply.code(400);
      return { error: 'depth must be a positive integer' };
    }

    const result = await analyzeFileImpact({
      repositoryId: params.repoId,
      filePath: query.filePath.trim(),
      revisionSha: query.revisionSha,
      depth
    });

    if (!result) {
      reply.code(404);
      return { error: 'file not found for repository' };
    }

    return result;
  });

  server.get('/api/v1/repositories/:repoId/graph', async (request, reply) => {
    const params = request.params as { repoId: string };
    const query = request.query as {
      view?: string;
      filePath?: string;
      symbolId?: string;
      revisionSha?: string;
      depth?: string;
    };
    const view = parseContextGraphView(query.view);
    const depth = query.depth ? Number(query.depth) : undefined;

    if (query.depth && (!Number.isFinite(depth) || Number(depth) < 1)) {
      reply.code(400);
      return { error: 'depth must be a positive integer' };
    }

    if (view === 'neighbors' && !query.filePath && !query.symbolId) {
      reply.code(400);
      return { error: 'filePath or symbolId is required for neighbors view' };
    }

    const result = await expandContext({
      repositoryId: params.repoId,
      view,
      filePath: query.filePath,
      symbolId: query.symbolId,
      revisionSha: query.revisionSha,
      depth
    });

    if (view === 'neighbors' && !result) {
      reply.code(404);
      return { error: 'graph seed not found for repository' };
    }

    return result ?? { revisionSha: '', nodes: [], edges: [] };
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

