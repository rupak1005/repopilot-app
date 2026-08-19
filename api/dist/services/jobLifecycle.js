"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQueuedJobStatus = updateQueuedJobStatus;
exports.markStaleQueuedJobsForPullRequest = markStaleQueuedJobsForPullRequest;
exports.isNonRetryableError = isNonRetryableError;
const prisma_1 = require("../db/prisma");
async function updateQueuedJobStatus(args) {
    const prisma = (0, prisma_1.getPrisma)();
    await prisma.$executeRawUnsafe(`
      UPDATE "QueuedJob"
      SET
        "status" = $2,
        "attempts" = COALESCE($3, "attempts"),
        "lastError" = $4,
        "bullJobId" = COALESCE($5, "bullJobId"),
        "updatedAt" = NOW()
      WHERE "id" = $1
    `, args.queuedJobId, args.status, args.attempts ?? null, args.lastError ?? null, args.bullJobId ?? null);
}
async function markStaleQueuedJobsForPullRequest(args) {
    const prisma = (0, prisma_1.getPrisma)();
    await prisma.$executeRawUnsafe(`
      UPDATE "QueuedJob"
      SET "status" = 'STALE', "updatedAt" = NOW()
      WHERE "pullRequestId" = $1
        AND "status" IN ('QUEUED', 'RUNNING')
        AND ("payload"->>'headSha') IS NOT NULL
        AND ("payload"->>'headSha') <> $2
    `, args.pullRequestId, args.currentHeadRevision);
}
function isNonRetryableError(err) {
    const message = err instanceof Error ? err.message : String(err);
    return (message.includes('pull request not found') ||
        message.includes('401') ||
        message.includes('403') ||
        message.includes('404') ||
        message.includes('invalid token'));
}
