import { getPrisma } from '../db/prisma';

export type QueuedJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'DEAD_LETTER'
  | 'STALE';

export async function updateQueuedJobStatus(args: {
  queuedJobId: string;
  status: QueuedJobStatus;
  attempts?: number;
  lastError?: string | null;
  bullJobId?: string | null;
}): Promise<void> {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(
    `
      UPDATE "QueuedJob"
      SET
        "status" = $2,
        "attempts" = COALESCE($3, "attempts"),
        "lastError" = $4,
        "bullJobId" = COALESCE($5, "bullJobId"),
        "updatedAt" = NOW()
      WHERE "id" = $1
    `,
    args.queuedJobId,
    args.status,
    args.attempts ?? null,
    args.lastError ?? null,
    args.bullJobId ?? null
  );
}

export async function markStaleQueuedJobsForPullRequest(args: {
  pullRequestId: string;
  currentHeadRevision: string;
}): Promise<void> {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(
    `
      UPDATE "QueuedJob"
      SET "status" = 'STALE', "updatedAt" = NOW()
      WHERE "pullRequestId" = $1
        AND "status" IN ('QUEUED', 'RUNNING')
        AND ("payload"->>'headSha') IS NOT NULL
        AND ("payload"->>'headSha') <> $2
    `,
    args.pullRequestId,
    args.currentHeadRevision
  );
}

export function isNonRetryableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('pull request not found') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404') ||
    message.includes('invalid token')
  );
}
