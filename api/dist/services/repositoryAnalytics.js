"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepositoryAnalytics = getRepositoryAnalytics;
exports.listReviewHistory = listReviewHistory;
const prisma_1 = require("../db/prisma");
async function getRepositoryAnalytics(repositoryId) {
    const prisma = (0, prisma_1.getPrisma)();
    const reviewCounts = (await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE r."status" = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE r."status" = 'FAILED')::int AS failed,
        AVG(
          EXTRACT(EPOCH FROM (r."completedAt" - r."startedAt")) * 1000
        ) FILTER (WHERE r."completedAt" IS NOT NULL) AS avg_latency_ms
      FROM "PullRequestReview" r
      JOIN "PullRequest" p ON p."id" = r."pullRequestId"
      WHERE p."repositoryId" = $1
    `, repositoryId));
    const severityRows = (await prisma.$queryRawUnsafe(`
      SELECT f."severity", COUNT(*)::int AS count
      FROM "ReviewFinding" f
      JOIN "PullRequestReview" r ON r."id" = f."reviewId"
      JOIN "PullRequest" p ON p."id" = r."pullRequestId"
      WHERE p."repositoryId" = $1
      GROUP BY f."severity"
    `, repositoryId));
    const recurringRows = (await prisma.$queryRawUnsafe(`
      SELECT f."fingerprint", COUNT(*)::int AS count
      FROM "ReviewFinding" f
      JOIN "PullRequestReview" r ON r."id" = f."reviewId"
      JOIN "PullRequest" p ON p."id" = r."pullRequestId"
      WHERE p."repositoryId" = $1
        AND f."fingerprint" IS NOT NULL
      GROUP BY f."fingerprint"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `, repositoryId));
    const counts = reviewCounts[0] ?? {
        total: 0,
        completed: 0,
        failed: 0,
        avg_latency_ms: null
    };
    const findingsBySeverity = {};
    for (const row of severityRows) {
        findingsBySeverity[row.severity] = row.count;
    }
    return {
        repositoryId,
        totalReviews: counts.total,
        completedReviews: counts.completed,
        failedReviews: counts.failed,
        averageReviewLatencyMs: counts.avg_latency_ms === null ? null : Math.round(Number(counts.avg_latency_ms)),
        findingsBySeverity,
        recurringFindings: recurringRows
    };
}
async function listReviewHistory(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT
        r."id" AS "reviewId",
        p."number" AS "pullNumber",
        r."headRevision",
        r."status",
        r."outcome",
        r."startedAt",
        r."completedAt",
        (
          SELECT COUNT(*)::int
          FROM "ReviewFinding" f
          WHERE f."reviewId" = r."id"
        ) AS "findingsCount"
      FROM "PullRequestReview" r
      JOIN "PullRequest" p ON p."id" = r."pullRequestId"
      WHERE p."repositoryId" = $1
        AND ($2::int IS NULL OR p."number" = $2)
      ORDER BY r."startedAt" DESC
    `, args.repositoryId, args.pullNumber ?? null));
    return rows.map((row) => ({
        reviewId: row.reviewId,
        pullNumber: row.pullNumber,
        headRevision: row.headRevision,
        status: row.status,
        outcome: row.outcome,
        startedAt: row.startedAt.toISOString(),
        completedAt: row.completedAt?.toISOString() ?? null,
        findingsCount: row.findingsCount
    }));
}
