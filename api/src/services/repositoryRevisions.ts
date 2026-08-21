import { getPrisma } from '../db/prisma';

export type RepositoryRevisionInfo = {
  id: string;
  repositoryId: string;
  revisionSha: string;
  indexedAt: Date;
};

export type RepositoryRevisionStatus = RepositoryRevisionInfo & {
  fileCount: number;
  symbolCount: number;
  symbolDependencyCount: number;
  moduleDependencyCount: number;
};

/** Accept full SHAs or UI short prefixes (`?rev=5117ce9`). Min 7 chars for prefix match. */
export function normalizeRevisionShaQuery(revisionSha?: string | null): string | null {
  if (typeof revisionSha !== 'string') return null;
  const sha = revisionSha.trim().toLowerCase();
  return sha.length > 0 ? sha : null;
}

export async function resolveRepositoryRevision(args: {
  repositoryId: string;
  revisionSha?: string;
}): Promise<RepositoryRevisionInfo | null> {
  const prisma = getPrisma();
  const sha = normalizeRevisionShaQuery(args.revisionSha);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "id", "repositoryId", "revisionSha", "indexedAt"
      FROM "RepositoryRevision"
      WHERE "repositoryId" = $1
        AND (
          $2::text IS NULL
          OR lower("revisionSha") = $2
          OR (
            length($2) >= 7
            AND lower("revisionSha") LIKE $2 || '%'
          )
        )
      ORDER BY
        CASE WHEN $2::text IS NOT NULL AND lower("revisionSha") = $2 THEN 0 ELSE 1 END,
        "indexedAt" DESC
      LIMIT 1
    `,
    args.repositoryId,
    sha
  )) as RepositoryRevisionInfo[];

  return rows[0] ?? null;
}

export async function listRepositoryRevisions(
  repositoryId: string
): Promise<RepositoryRevisionInfo[]> {
  const prisma = getPrisma();
  return (await prisma.$queryRawUnsafe(
    `
      SELECT "id", "repositoryId", "revisionSha", "indexedAt"
      FROM "RepositoryRevision"
      WHERE "repositoryId" = $1
      ORDER BY "indexedAt" DESC
    `,
    repositoryId
  )) as RepositoryRevisionInfo[];
}

export async function getRepositoryRevisionStatus(args: {
  repositoryId: string;
  revisionSha: string;
}): Promise<RepositoryRevisionStatus | null> {
  const revision = await resolveRepositoryRevision(args);
  if (!revision) return null;

  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        rr."id",
        rr."repositoryId",
        rr."revisionSha",
        rr."indexedAt",
        COALESCE(file_counts."fileCount", 0) AS "fileCount",
        COALESCE(symbol_counts."symbolCount", 0) AS "symbolCount",
        COALESCE(symbol_dep_counts."symbolDependencyCount", 0) AS "symbolDependencyCount",
        COALESCE(module_dep_counts."moduleDependencyCount", 0) AS "moduleDependencyCount"
      FROM "RepositoryRevision" rr
      LEFT JOIN (
        SELECT "revisionId", COUNT(*)::int AS "fileCount"
        FROM "File"
        GROUP BY "revisionId"
      ) file_counts ON file_counts."revisionId" = rr."id"
      LEFT JOIN (
        SELECT f."revisionId", COUNT(*)::int AS "symbolCount"
        FROM "Symbol" s
        JOIN "File" f ON f."id" = s."fileId"
        GROUP BY f."revisionId"
      ) symbol_counts ON symbol_counts."revisionId" = rr."id"
      LEFT JOIN (
        SELECT "revisionId", COUNT(*)::int AS "symbolDependencyCount"
        FROM "SymbolDependency"
        GROUP BY "revisionId"
      ) symbol_dep_counts ON symbol_dep_counts."revisionId" = rr."id"
      LEFT JOIN (
        SELECT "revisionId", COUNT(*)::int AS "moduleDependencyCount"
        FROM "ModuleDependency"
        GROUP BY "revisionId"
      ) module_dep_counts ON module_dep_counts."revisionId" = rr."id"
      WHERE rr."id" = $1
      LIMIT 1
    `,
    revision.id
  )) as RepositoryRevisionStatus[];

  return rows[0] ?? null;
}
