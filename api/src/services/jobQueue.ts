import { getPrisma } from '../db/prisma';

export type RepoSyncJobPayload = {
  repositoryId: string;
  revisionSha: string;
  ref?: string | null;
  queuedJobId?: string;
};

export type PrReviewJobPayload = {
  repositoryId: string;
  pullRequestId: string;
  pullNumber: number;
  baseSha: string;
  headSha: string;
  queuedJobId?: string;
};

export type ClaimedQueuedJob = {
  id: string;
  type: string;
  payload: RepoSyncJobPayload | PrReviewJobPayload;
  attempts: number;
};

export async function claimNextQueuedJob(): Promise<ClaimedQueuedJob | null> {
  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
      UPDATE "QueuedJob"
      SET
        "status" = 'RUNNING',
        "attempts" = "attempts" + 1,
        "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id"
        FROM "QueuedJob"
        WHERE "status" = 'QUEUED'
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "type", "payload", "attempts"
    `
  )) as Array<{
    id: string;
    type: string;
    payload: RepoSyncJobPayload | PrReviewJobPayload;
    attempts: number;
  }>;

  const job = rows[0];
  if (!job) return null;

  return {
    id: job.id,
    type: job.type,
    payload: job.payload,
    attempts: job.attempts
  };
}

export const MAX_JOB_ATTEMPTS = 3;
