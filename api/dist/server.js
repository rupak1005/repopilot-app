"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const env_1 = __importDefault(require("@fastify/env"));
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const githubWebhook_1 = require("./services/githubWebhook");
const dependencyGraphQueries_1 = require("./services/dependencyGraphQueries");
const repositoryRevisions_1 = require("./services/repositoryRevisions");
const codebaseQa_1 = require("./services/codebaseQa");
const searchIndex_1 = require("./services/searchIndex");
const prReview_1 = require("./services/prReview");
const repositoryAnalytics_1 = require("./services/repositoryAnalytics");
const historyIngest_1 = require("./services/historyIngest");
const engineeringIntelligence_1 = require("./services/engineeringIntelligence");
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
    await server.register(cors_1.default, { origin: true });
    server.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
        try {
            const rawBody = typeof body === 'string' ? body : body.toString('utf8');
            const json = rawBody ? JSON.parse(rawBody) : null;
            done(null, { rawBody, json });
        }
        catch (err) {
            done(err, undefined);
        }
    });
    await server.register(env_1.default, {
        dotenv: true,
        schema: {
            type: 'object',
            required: ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT'],
            properties: {
                PORT: { type: 'string', default: '3001' },
                DATABASE_URL: { type: 'string' },
                REDIS_HOST: { type: 'string' },
                REDIS_PORT: { type: 'string' },
                GITHUB_WEBHOOK_SECRET: { type: 'string' }
            }
        }
    });
    server.get('/health', async () => ({ status: 'ok' }));
    server.get('/api/v1/repositories/:repoId/dependencies', async (request, reply) => {
        const params = request.params;
        const query = request.query;
        const depth = query.depth ? Number(query.depth) : undefined;
        if (query.depth && (!Number.isFinite(depth) || Number(depth) < 1)) {
            reply.code(400);
            return {
                error: 'depth must be a positive integer'
            };
        }
        if (query.symbolId) {
            const result = await (0, dependencyGraphQueries_1.getSymbolDependencyTraversal)({
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
            const result = await (0, dependencyGraphQueries_1.getModuleDependencyTraversal)({
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
        const params = request.params;
        return (0, repositoryRevisions_1.listRepositoryRevisions)(params.repoId);
    });
    server.get('/api/v1/repositories/:repoId/revisions/:sha', async (request, reply) => {
        const params = request.params;
        const result = await (0, repositoryRevisions_1.getRepositoryRevisionStatus)({
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
        const params = request.params;
        const body = (request.body?.json ?? {});
        if (!body.query || !body.query.trim()) {
            reply.code(400);
            return { error: 'query is required' };
        }
        const topK = body.topK ? Number(body.topK) : undefined;
        if (topK !== undefined && (!Number.isFinite(topK) || topK < 1)) {
            reply.code(400);
            return { error: 'topK must be a positive integer' };
        }
        return (0, searchIndex_1.searchRepository)({
            repositoryId: params.repoId,
            query: body.query,
            topK,
            revisionSha: body.revisionSha
        });
    });
    server.post('/api/v1/repositories/:repoId/ask', async (request, reply) => {
        const params = request.params;
        const body = (request.body?.json ?? {});
        if (!body.query || !body.query.trim()) {
            reply.code(400);
            return { error: 'query is required' };
        }
        return (0, codebaseQa_1.askCodebaseQuestion)({
            repositoryId: params.repoId,
            query: body.query,
            revisionSha: body.revisionSha
        });
    });
    server.get('/api/v1/repositories/:repoId/pulls', async (request) => {
        const params = request.params;
        return (0, prReview_1.listPullRequests)(params.repoId);
    });
    server.get('/api/v1/repositories/:repoId/pulls/:number', async (request, reply) => {
        const params = request.params;
        const pullNumber = Number(params.number);
        if (!Number.isFinite(pullNumber) || pullNumber < 1) {
            reply.code(400);
            return { error: 'pull number must be a positive integer' };
        }
        const result = await (0, prReview_1.getPullRequestDetails)({
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
        const params = request.params;
        const body = (request.body?.json ?? {});
        const pullNumber = Number(params.number);
        if (!Number.isFinite(pullNumber) || pullNumber < 1) {
            reply.code(400);
            return { error: 'pull number must be a positive integer' };
        }
        try {
            return await (0, prReview_1.triggerPullRequestReview)({
                repositoryId: params.repoId,
                pullNumber,
                force: body.force === true,
                sync: body.sync === true
            });
        }
        catch (err) {
            if (err instanceof Error && err.message === 'pull request not found') {
                reply.code(404);
                return { error: 'pull request not found' };
            }
            throw err;
        }
    });
    server.get('/api/v1/repositories/:repoId/reviews/history', async (request) => {
        const params = request.params;
        const query = request.query;
        const pullNumber = query.pullNumber ? Number(query.pullNumber) : undefined;
        return (0, repositoryAnalytics_1.listReviewHistory)({
            repositoryId: params.repoId,
            pullNumber: Number.isFinite(pullNumber) ? pullNumber : undefined
        });
    });
    server.get('/api/v1/repositories/:repoId/analytics', async (request) => {
        const params = request.params;
        return (0, repositoryAnalytics_1.getRepositoryAnalytics)(params.repoId);
    });
    server.post('/api/v1/repositories/:repoId/history/ingest', async (request, reply) => {
        const params = request.params;
        const body = (request.body?.json ?? {});
        let repoPath = body.repoPath;
        if (!repoPath) {
            const cloneRoot = process.env.REPO_CLONE_ROOT;
            if (!cloneRoot) {
                reply.code(400);
                return { error: 'repoPath is required (or set REPO_CLONE_ROOT with indexed repository metadata)' };
            }
            const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
            const rows = (await pool.query('SELECT "owner", "name" FROM "Repository" WHERE "id" = $1 LIMIT 1', [params.repoId]));
            await pool.end();
            const meta = rows.rows[0];
            if (!meta) {
                reply.code(404);
                return { error: 'repository not found' };
            }
            repoPath = `${cloneRoot}/${meta.owner}/${meta.name}`;
        }
        return (0, historyIngest_1.ingestRepositoryHistory)({
            repositoryId: params.repoId,
            repoPath,
            rebuild: body.rebuild === true,
            maxCount: body.maxCount
        });
    });
    server.get('/api/v1/repositories/:repoId/hotspots', async (request) => {
        const params = request.params;
        const query = request.query;
        const topK = query.topK ? Number(query.topK) : undefined;
        return (0, engineeringIntelligence_1.listModuleHotspots)({
            repositoryId: params.repoId,
            topK
        });
    });
    server.get('/api/v1/repositories/:repoId/co-change', async (request, reply) => {
        const params = request.params;
        const query = request.query;
        if (!query.file) {
            reply.code(400);
            return { error: 'file query parameter is required' };
        }
        const topK = query.topK ? Number(query.topK) : undefined;
        return (0, engineeringIntelligence_1.getCoChanges)({
            repositoryId: params.repoId,
            filePath: query.file,
            topK
        });
    });
    server.post('/api/v1/repositories/:repoId/search/history', async (request, reply) => {
        const params = request.params;
        const body = (request.body?.json ?? {});
        if (!body.query?.trim()) {
            reply.code(400);
            return { error: 'query is required' };
        }
        return (0, engineeringIntelligence_1.searchHistory)({
            repositoryId: params.repoId,
            query: body.query,
            type: body.type,
            topK: body.topK
        });
    });
    server.get('/api/v1/repositories/:repoId/similar-changes', async (request, reply) => {
        const params = request.params;
        const query = request.query;
        const pullNumber = query.pullNumber ? Number(query.pullNumber) : NaN;
        if (!Number.isFinite(pullNumber) || pullNumber < 1) {
            reply.code(400);
            return { error: 'pullNumber query parameter is required' };
        }
        return (0, engineeringIntelligence_1.findSimilarChanges)({
            repositoryId: params.repoId,
            pullNumber,
            topK: query.topK ? Number(query.topK) : undefined
        });
    });
    server.get('/api/v1/repositories/:repoId/architecture', async (request) => {
        const params = request.params;
        const query = request.query;
        return (0, engineeringIntelligence_1.getArchitectureGraph)({
            repositoryId: params.repoId,
            revisionSha: query.revisionSha
        });
    });
    server.get('/api/v1/repositories/:repoId/symbols/:name/history', async (request) => {
        const params = request.params;
        const query = request.query;
        return (0, engineeringIntelligence_1.getSymbolChangeHistory)({
            repositoryId: params.repoId,
            symbolName: params.name,
            topK: query.topK ? Number(query.topK) : undefined
        });
    });
    server.post('/webhook', async (request, reply) => {
        const body = request.body;
        const rawBody = body?.rawBody ?? '';
        const signature = request.headers['x-hub-signature-256'];
        const event = request.headers['x-github-event'];
        const deliveryId = request.headers['x-github-delivery'];
        const secret = process.env.GITHUB_WEBHOOK_SECRET;
        if (!secret) {
            reply.code(500);
            return { error: 'GITHUB_WEBHOOK_SECRET is not configured' };
        }
        if (typeof signature !== 'string' || !(0, githubWebhook_1.verifyGitHubSignature)({ rawBody, signatureHeader: signature, secret })) {
            server.log.warn({ event: 'webhook.invalid_signature' }, 'Invalid webhook signature');
            reply.code(401);
            return { error: 'invalid signature' };
        }
        if (typeof event !== 'string' || typeof deliveryId !== 'string') {
            reply.code(400);
            return { error: 'missing required webhook headers' };
        }
        try {
            const result = await (0, githubWebhook_1.handleGitHubWebhook)({
                event,
                deliveryId,
                rawBody
            });
            server.log.info({
                event: event === 'pull_request' ? 'pr.received' : 'repo.push',
                githubEvent: event,
                deliveryId,
                duplicate: result.duplicate,
                repositoryId: result.repositoryId,
                queuedJobId: result.queuedJobId
            }, 'Webhook received');
            return {
                ok: true,
                duplicate: result.duplicate,
                queuedJobId: result.queuedJobId
            };
        }
        catch (err) {
            server.log.error({ err, deliveryId, githubEvent: event }, 'Webhook processing failed');
            reply.code(500);
            return { error: 'webhook processing failed' };
        }
    });
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
