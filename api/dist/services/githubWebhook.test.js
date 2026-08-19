"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const vitest_1 = require("vitest");
const prisma_1 = require("../db/prisma");
const githubWebhook_1 = require("./githubWebhook");
async function ensurePhase7Tables() {
    const prisma = (0, prisma_1.getPrisma)();
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "deliveryId" TEXT NOT NULL,
      "event" TEXT NOT NULL,
      "action" TEXT,
      "repositoryId" UUID,
      "payload" JSONB NOT NULL,
      "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "WebhookDelivery_repositoryId_fkey"
        FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL
    )
  `);
    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "WebhookDelivery_deliveryId_key"
      ON "WebhookDelivery"("deliveryId")
  `);
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PullRequest" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "repositoryId" UUID NOT NULL,
      "number" INTEGER NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT,
      "authorLogin" TEXT,
      "baseBranch" TEXT NOT NULL,
      "headBranch" TEXT NOT NULL,
      "baseRevision" TEXT NOT NULL,
      "headRevision" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "PullRequest_repositoryId_fkey"
        FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
    )
  `);
    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PullRequest_repositoryId_number_key"
      ON "PullRequest"("repositoryId", "number")
  `);
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PullRequestRevision" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "pullRequestId" UUID NOT NULL,
      "deliveryId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "baseRevision" TEXT NOT NULL,
      "headRevision" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PullRequestRevision_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "PullRequestRevision_pullRequestId_fkey"
        FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE
    )
  `);
    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "PullRequestRevision_pullRequestId_headRevision_key"
      ON "PullRequestRevision"("pullRequestId", "headRevision")
  `);
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "QueuedJob" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "type" TEXT NOT NULL,
      "repositoryId" UUID NOT NULL,
      "pullRequestId" UUID,
      "deliveryId" TEXT NOT NULL,
      "dedupeKey" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'QUEUED',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "QueuedJob_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "QueuedJob_repositoryId_fkey"
        FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE,
      CONSTRAINT "QueuedJob_pullRequestId_fkey"
        FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE
    )
  `);
    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "QueuedJob_dedupeKey_key"
      ON "QueuedJob"("dedupeKey")
  `);
}
(0, vitest_1.describe)('githubWebhook (unit)', () => {
    (0, vitest_1.it)('verifies GitHub webhook signatures', () => {
        const rawBody = JSON.stringify({ hello: 'world' });
        const secret = 'top-secret';
        const signature = `sha256=${node_crypto_1.default
            .createHmac('sha256', secret)
            .update(rawBody, 'utf8')
            .digest('hex')}`;
        (0, vitest_1.expect)((0, githubWebhook_1.verifyGitHubSignature)({
            rawBody,
            signatureHeader: signature,
            secret
        })).toBe(true);
        (0, vitest_1.expect)((0, githubWebhook_1.verifyGitHubSignature)({
            rawBody,
            signatureHeader: 'sha256=bad',
            secret
        })).toBe(false);
    });
    (0, vitest_1.it)('derives a stable repository id from full name', () => {
        const repository = {
            name: 'repoPilot',
            full_name: 'deadlyr/repoPilot',
            owner: { login: 'deadlyr' }
        };
        (0, vitest_1.expect)((0, githubWebhook_1.deriveRepositoryId)(repository)).toBe((0, githubWebhook_1.deriveRepositoryId)(repository));
    });
});
(0, vitest_1.describe)('githubWebhook (integration, optional)', () => {
    (0, vitest_1.it)('stores pull request metadata and dedupes repeated deliveries', async () => {
        const testDbUrl = process.env.TEST_DATABASE_URL;
        if (!testDbUrl) {
            console.warn('Skipping integration test: set TEST_DATABASE_URL to enable.');
            return;
        }
        process.env.DATABASE_URL = testDbUrl;
        await ensurePhase7Tables();
        const payload = {
            action: 'opened',
            repository: {
                name: 'repoPilot',
                full_name: 'deadlyr/repoPilot',
                owner: { login: 'deadlyr' }
            },
            pull_request: {
                number: 42,
                title: 'Add feature',
                body: 'PR body',
                state: 'open',
                user: { login: 'octocat' },
                base: { ref: 'main', sha: 'base-sha' },
                head: { ref: 'feature', sha: 'head-sha' }
            }
        };
        const rawBody = JSON.stringify(payload);
        const first = await (0, githubWebhook_1.handleGitHubWebhook)({
            event: 'pull_request',
            deliveryId: 'delivery-1',
            rawBody
        });
        const second = await (0, githubWebhook_1.handleGitHubWebhook)({
            event: 'pull_request',
            deliveryId: 'delivery-1',
            rawBody
        });
        (0, vitest_1.expect)(first.duplicate).toBe(false);
        (0, vitest_1.expect)(second.duplicate).toBe(true);
        const prisma = (0, prisma_1.getPrisma)();
        const rows = (await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS count
        FROM "QueuedJob"
        WHERE "dedupeKey" = $1
      `, `repo:${(0, githubWebhook_1.deriveRepositoryId)(payload.repository)}:pr:42:head-sha`));
        (0, vitest_1.expect)(rows[0]?.count).toBe(1);
    });
});
