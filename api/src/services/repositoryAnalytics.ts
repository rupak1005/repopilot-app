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

export type RepositoryFinding = {
  id: string;
  pullNumber: number;
  pullTitle: string;
  headRevision: string;
  title: string;
  severity: string;
  category: string;
  confidence: string;
  description: string;
  suggestedAction?: string;
  evidence: Array<{ type: string; file: string; lines: [number, number] }>;
};

export async function listRepositoryFindings(args: {
  repositoryId: string;
  limit?: number;
}): Promise<RepositoryFinding[]> {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(args.limit ?? 80, 1), 200);

  const findingRows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        f."id",
        p."number" AS "pullNumber",
        p."title" AS "pullTitle",
        r."headRevision",
        f."title",
        f."severity",
        f."category",
        f."confidence",
        f."description",
        f."suggestedAction"
      FROM "ReviewFinding" f
      JOIN "PullRequestReview" r ON r."id" = f."reviewId"
      JOIN "PullRequest" p ON p."id" = r."pullRequestId"
      WHERE p."repositoryId" = $1
        AND r."id" IN (
          SELECT DISTINCT ON (p2."id") r2."id"
          FROM "PullRequestReview" r2
          JOIN "PullRequest" p2 ON p2."id" = r2."pullRequestId"
          WHERE p2."repositoryId" = $1
          ORDER BY p2."id", r2."startedAt" DESC
        )
      ORDER BY
        CASE UPPER(f."severity")
          WHEN 'CRITICAL' THEN 0
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          ELSE 3
        END,
        f."title"
      LIMIT $2
    `,
    args.repositoryId,
    limit
  )) as Array<{
    id: string;
    pullNumber: number;
    pullTitle: string;
    headRevision: string;
    title: string;
    severity: string;
    category: string;
    confidence: string;
    description: string;
    suggestedAction: string | null;
  }>;

  if (findingRows.length === 0) return [];

  const ids = findingRows.map((row) => row.id);
  const evidenceRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "findingId", "type", "filePath", "startLine", "endLine"
      FROM "ReviewEvidence"
      WHERE "findingId" = ANY($1::text[])
      ORDER BY "filePath", "startLine"
    `,
    ids
  )) as Array<{
    findingId: string;
    type: string;
    filePath: string;
    startLine: number;
    endLine: number;
  }>;

  const evidenceByFinding = new Map<string, RepositoryFinding['evidence']>();
  for (const row of evidenceRows) {
    const list = evidenceByFinding.get(row.findingId) ?? [];
    list.push({
      type: row.type,
      file: row.filePath,
      lines: [row.startLine, row.endLine]
    });
    evidenceByFinding.set(row.findingId, list);
  }

  return findingRows.map((row) => ({
    id: row.id,
    pullNumber: row.pullNumber,
    pullTitle: row.pullTitle,
    headRevision: row.headRevision,
    title: row.title,
    severity: row.severity,
    category: row.category,
    confidence: row.confidence,
    description: row.description,
    suggestedAction: row.suggestedAction ?? undefined,
    evidence: evidenceByFinding.get(row.id) ?? []
  }));
}
