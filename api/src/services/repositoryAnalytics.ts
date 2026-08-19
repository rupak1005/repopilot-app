import { getPrisma } from '../db/prisma';

export type RepositoryAnalytics = {
  repositoryId: string;
  totalReviews: number;
  completedReviews: number;
  failedReviews: number;
  averageReviewLatencyMs: number | null;
  findingsBySeverity: Record<string, number>;
  recurringFindings: Array<{ fingerprint: string; count: number }>;
};

export async function getRepositoryAnalytics(
  repositoryId: string
): Promise<RepositoryAnalytics> {
  const prisma = getPrisma();

  const reviewCounts = (await prisma.$queryRawUnsafe(
    `
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
    `,
    repositoryId
  )) as Array<{
    total: number;
    completed: number;
    failed: number;
    avg_latency_ms: number | null;
  }>;

  const severityRows = (await prisma.$queryRawUnsafe(
    `
      SELECT f."severity", COUNT(*)::int AS count
      FROM "ReviewFinding" f
      JOIN "PullRequestReview" r ON r."id" = f."reviewId"
      JOIN "PullRequest" p ON p."id" = r."pullRequestId"
      WHERE p."repositoryId" = $1
      GROUP BY f."severity"
    `,
    repositoryId
  )) as Array<{ severity: string; count: number }>;

  const recurringRows = (await prisma.$queryRawUnsafe(
    `
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
    `,
    repositoryId
  )) as Array<{ fingerprint: string; count: number }>;

  const counts = reviewCounts[0] ?? {
    total: 0,
    completed: 0,
    failed: 0,
    avg_latency_ms: null
  };

  const findingsBySeverity: Record<string, number> = {};
  for (const row of severityRows) {
    findingsBySeverity[row.severity] = row.count;
  }

  return {
    repositoryId,
    totalReviews: counts.total,
    completedReviews: counts.completed,
    failedReviews: counts.failed,
    averageReviewLatencyMs:
      counts.avg_latency_ms === null ? null : Math.round(Number(counts.avg_latency_ms)),
    findingsBySeverity,
    recurringFindings: recurringRows
  };
}

export async function listReviewHistory(args: {
  repositoryId: string;
  pullNumber?: number;
}): Promise<
  Array<{
    reviewId: string;
    pullNumber: number;
    headRevision: string;
    status: string;
    outcome: string | null;
    startedAt: string;
    completedAt: string | null;
    findingsCount: number;
  }>
> {
  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
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
    `,
    args.repositoryId,
    args.pullNumber ?? null
  )) as Array<{
    reviewId: string;
    pullNumber: number;
    headRevision: string;
    status: string;
    outcome: string | null;
    startedAt: Date;
    completedAt: Date | null;
    findingsCount: number;
  }>;

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
