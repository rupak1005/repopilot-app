import crypto from 'node:crypto';
import { deriveRepositoryId as deriveRepositoryIdFromFullName } from '@repopilot/common';
import { getPrisma } from '../db/prisma';
import { ensureRepository } from '../repo/persistence';
import { markStaleQueuedJobsForPullRequest } from './jobLifecycle';
import { queuePullRequestReview } from './prReview';

type GitHubRepositoryPayload = {
  name: string;
  full_name: string;
  owner?: {
    login?: string;
  };
};

type GitHubPushPayload = {
  ref?: string;
  after?: string;
  repository?: GitHubRepositoryPayload;
};

type GitHubPullRequestPayload = {
  action?: string;
  repository?: GitHubRepositoryPayload;
  pull_request?: {
    number: number;
    title: string;
    body?: string | null;
    state: string;
    user?: {
      login?: string;
    };
    base: {
      ref: string;
      sha: string;
    };
    head: {
      ref: string;
      sha: string;
    };
  };
};

export type WebhookHandleResult = {
  duplicate: boolean;
  repositoryId: string | null;
  queuedJobId: string | null;
  event: string;
};

export function deriveRepositoryId(repository: GitHubRepositoryPayload): string {
  return deriveRepositoryIdFromFullName(repository.full_name);
}

export function verifyGitHubSignature(args: {
  rawBody: string;
  signatureHeader?: string;
  secret: string;
}): boolean {
  if (!args.signatureHeader) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', args.secret)
    .update(args.rawBody, 'utf8')
    .digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(args.signatureHeader);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

async function recordWebhookDelivery(args: {
  deliveryId: string;
  event: string;
  action?: string;
  repositoryId?: string;
  payload: unknown;
}): Promise<boolean> {
  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
      INSERT INTO "WebhookDelivery" ("deliveryId", "event", "action", "repositoryId", "payload")
      VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT ("deliveryId") DO NOTHING
      RETURNING "id"
    `,
    args.deliveryId,
    args.event,
    args.action ?? null,
    args.repositoryId ?? null,
    JSON.stringify(args.payload)
  )) as Array<{ id: string }>;

  return rows.length > 0;
}

async function upsertPullRequestRecord(args: {
  repositoryId: string;
  number: number;
  title: string;
  body?: string | null;
  authorLogin?: string;
  baseBranch: string;
  headBranch: string;
  baseRevision: string;
  headRevision: string;
  status: string;
}): Promise<string> {
  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
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
    `,
    args.repositoryId,
    args.number,
    args.title,
    args.body ?? null,
    args.authorLogin ?? null,
    args.baseBranch,
    args.headBranch,
    args.baseRevision,
    args.headRevision,
    args.status
  )) as Array<{ id: string }>;

  const pullRequest = rows[0];
  if (!pullRequest) {
    throw new Error(`Failed to upsert pull request #${args.number}`);
  }

  return pullRequest.id;
}

async function markStalePullRequestRevisions(args: {
  pullRequestId: string;
  currentHeadRevision: string;
}) {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(
    `
      UPDATE "PullRequestRevision"
      SET "status" = 'STALE'
      WHERE "pullRequestId" = $1
        AND "headRevision" <> $2
        AND "status" <> 'STALE'
    `,
    args.pullRequestId,
    args.currentHeadRevision
  );
}

async function upsertPullRequestRevision(args: {
  pullRequestId: string;
  deliveryId: string;
  action: string;
  baseRevision: string;
  headRevision: string;
  status: string;
}) {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(
    `
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
    `,
    args.pullRequestId,
    args.deliveryId,
    args.action,
    args.baseRevision,
    args.headRevision,
    args.status
  );
}

async function enqueueJob(args: {
  type: string;
  repositoryId: string;
  pullRequestId?: string;
  deliveryId: string;
  dedupeKey: string;
  payload: unknown;
}): Promise<string | null> {
  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
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
    `,
    args.type,
    args.repositoryId,
    args.pullRequestId ?? null,
    args.deliveryId,
    args.dedupeKey,
    JSON.stringify(args.payload)
  )) as Array<{ id: string }>;

  return rows[0]?.id ?? null;
}

export async function handleGitHubWebhook(args: {
  event: string;
  deliveryId: string;
  rawBody: string;
}): Promise<WebhookHandleResult> {
  const payload = JSON.parse(args.rawBody) as GitHubPushPayload & GitHubPullRequestPayload;
  const repository = payload.repository;
  const repositoryId = repository ? deriveRepositoryId(repository) : null;

  if (repository && repositoryId) {
    await ensureRepository({
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
      await markStaleQueuedJobsForPullRequest({
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

    const shouldQueueReview = ['opened', 'reopened', 'synchronize'].includes(
      payload.action ?? ''
    );
    let queuedJobId: string | null = null;
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
        await queuePullRequestReview({
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
