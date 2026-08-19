"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveRepositoryId = deriveRepositoryId;
exports.verifyGitHubSignature = verifyGitHubSignature;
exports.handleGitHubWebhook = handleGitHubWebhook;
const node_crypto_1 = __importDefault(require("node:crypto"));
const prisma_1 = require("../db/prisma");
const persistence_1 = require("../repo/persistence");
const jobLifecycle_1 = require("./jobLifecycle");
const prReview_1 = require("./prReview");
function deterministicUuid(input) {
    const hash = node_crypto_1.default.createHash('sha256').update(input).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}
function deriveRepositoryId(repository) {
    return deterministicUuid(repository.full_name.toLowerCase());
}
function verifyGitHubSignature(args) {
    if (!args.signatureHeader)
        return false;
    const expected = `sha256=${node_crypto_1.default
        .createHmac('sha256', args.secret)
        .update(args.rawBody, 'utf8')
        .digest('hex')}`;
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(args.signatureHeader);
    if (expectedBuffer.length !== providedBuffer.length) {
        return false;
    }
    return node_crypto_1.default.timingSafeEqual(expectedBuffer, providedBuffer);
}
async function recordWebhookDelivery(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
      INSERT INTO "WebhookDelivery" ("deliveryId", "event", "action", "repositoryId", "payload")
      VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT ("deliveryId") DO NOTHING
      RETURNING "id"
    `, args.deliveryId, args.event, args.action ?? null, args.repositoryId ?? null, JSON.stringify(args.payload)));
    return rows.length > 0;
}
async function upsertPullRequestRecord(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
      INSERT INTO "PullRequest" (
        "repositoryId",
        "number",
        "title",
        "body",
        "authorLogin",
        "baseBranch",
        "headBranch",
        "baseRevision",
        "headRevision",
        "status",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT ("repositoryId", "number")
      DO UPDATE SET
        "title" = EXCLUDED."title",
        "body" = EXCLUDED."body",
        "authorLogin" = EXCLUDED."authorLogin",
        "baseBranch" = EXCLUDED."baseBranch",
        "headBranch" = EXCLUDED."headBranch",
        "baseRevision" = EXCLUDED."baseRevision",
        "headRevision" = EXCLUDED."headRevision",
        "status" = EXCLUDED."status",
        "updatedAt" = NOW()
      RETURNING "id"
    `, args.repositoryId, args.number, args.title, args.body ?? null, args.authorLogin ?? null, args.baseBranch, args.headBranch, args.baseRevision, args.headRevision, args.status));
    const pullRequest = rows[0];
    if (!pullRequest) {
        throw new Error(`Failed to upsert pull request #${args.number}`);
    }
    return pullRequest.id;
}
async function markStalePullRequestRevisions(args) {
    const prisma = (0, prisma_1.getPrisma)();
    await prisma.$executeRawUnsafe(`
      UPDATE "PullRequestRevision"
      SET "status" = 'STALE'
      WHERE "pullRequestId" = $1
        AND "headRevision" <> $2
        AND "status" <> 'STALE'
    `, args.pullRequestId, args.currentHeadRevision);
}
async function upsertPullRequestRevision(args) {
    const prisma = (0, prisma_1.getPrisma)();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PullRequestRevision" (
        "pullRequestId",
        "deliveryId",
        "action",
        "baseRevision",
        "headRevision",
        "status"
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ("pullRequestId", "headRevision")
      DO UPDATE SET
        "deliveryId" = EXCLUDED."deliveryId",
        "action" = EXCLUDED."action",
        "baseRevision" = EXCLUDED."baseRevision",
        "status" = EXCLUDED."status"
    `, args.pullRequestId, args.deliveryId, args.action, args.baseRevision, args.headRevision, args.status);
}
async function enqueueJob(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
      INSERT INTO "QueuedJob" (
        "type",
        "repositoryId",
        "pullRequestId",
        "deliveryId",
        "dedupeKey",
        "payload"
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT ("dedupeKey") DO NOTHING
      RETURNING "id"
    `, args.type, args.repositoryId, args.pullRequestId ?? null, args.deliveryId, args.dedupeKey, JSON.stringify(args.payload)));
    return rows[0]?.id ?? null;
}
async function handleGitHubWebhook(args) {
    const payload = JSON.parse(args.rawBody);
    const repository = payload.repository;
    const repositoryId = repository ? deriveRepositoryId(repository) : null;
    if (repository && repositoryId) {
        await (0, persistence_1.ensureRepository)({
            repositoryId,
            name: repository.name,
            owner: repository.owner?.login ?? 'unknown'
        });
    }
    const inserted = await recordWebhookDelivery({
        deliveryId: args.deliveryId,
        event: args.event,
        action: payload.action,
        repositoryId: repositoryId ?? undefined,
        payload
    });
    if (!inserted) {
        return {
            duplicate: true,
            repositoryId,
            queuedJobId: null,
            event: args.event
        };
    }
    if (args.event === 'push' && repositoryId && payload.after) {
        const dedupeKey = `repo:${repositoryId}:push:${payload.after}`;
        const queuedJobId = await enqueueJob({
            type: 'repo-sync',
            repositoryId,
            deliveryId: args.deliveryId,
            dedupeKey,
            payload: {
                repositoryId,
                revisionSha: payload.after,
                ref: payload.ref ?? null
            }
        });
        return {
            duplicate: false,
            repositoryId,
            queuedJobId,
            event: args.event
        };
    }
    if (args.event === 'pull_request' && repositoryId && payload.pull_request) {
        const pullRequest = payload.pull_request;
        const status = pullRequest.state === 'open' ? 'OPEN' : pullRequest.state.toUpperCase();
        const pullRequestId = await upsertPullRequestRecord({
            repositoryId,
            number: pullRequest.number,
            title: pullRequest.title,
            body: pullRequest.body,
            authorLogin: pullRequest.user?.login,
            baseBranch: pullRequest.base.ref,
            headBranch: pullRequest.head.ref,
            baseRevision: pullRequest.base.sha,
            headRevision: pullRequest.head.sha,
            status
        });
        if (payload.action === 'synchronize') {
            await markStalePullRequestRevisions({
                pullRequestId,
                currentHeadRevision: pullRequest.head.sha
            });
            await (0, jobLifecycle_1.markStaleQueuedJobsForPullRequest)({
                pullRequestId,
                currentHeadRevision: pullRequest.head.sha
            });
        }
        await upsertPullRequestRevision({
            pullRequestId,
            deliveryId: args.deliveryId,
            action: payload.action ?? 'unknown',
            baseRevision: pullRequest.base.sha,
            headRevision: pullRequest.head.sha,
            status: payload.action === 'synchronize' ? 'QUEUED' : status
        });
        const shouldQueueReview = ['opened', 'reopened', 'synchronize'].includes(payload.action ?? '');
        let queuedJobId = null;
        if (shouldQueueReview) {
            const dedupeKey = `repo:${repositoryId}:pr:${pullRequest.number}:${pullRequest.head.sha}`;
            queuedJobId = await enqueueJob({
                type: 'pr-review',
                repositoryId,
                pullRequestId,
                deliveryId: args.deliveryId,
                dedupeKey,
                payload: {
                    repositoryId,
                    pullRequestId,
                    pullNumber: pullRequest.number,
                    baseSha: pullRequest.base.sha,
                    headSha: pullRequest.head.sha
                }
            });
            if (queuedJobId) {
                await (0, prReview_1.queuePullRequestReview)({
                    repositoryId,
                    pullNumber: pullRequest.number,
                    pullRequestId,
                    baseSha: pullRequest.base.sha,
                    headSha: pullRequest.head.sha,
                    queuedJobId
                });
            }
        }
        return {
            duplicate: false,
            repositoryId,
            queuedJobId,
            event: args.event
        };
    }
    return {
        duplicate: false,
        repositoryId,
        queuedJobId: null,
        event: args.event
    };
}
