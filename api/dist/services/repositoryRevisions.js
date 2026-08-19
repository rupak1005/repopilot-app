"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRepositoryRevision = resolveRepositoryRevision;
exports.listRepositoryRevisions = listRepositoryRevisions;
exports.getRepositoryRevisionStatus = getRepositoryRevisionStatus;
const prisma_1 = require("../db/prisma");
async function resolveRepositoryRevision(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT "id", "repositoryId", "revisionSha", "indexedAt"
      FROM "RepositoryRevision"
      WHERE "repositoryId" = $1
        AND ($2::text IS NULL OR "revisionSha" = $2)
      ORDER BY "indexedAt" DESC
      LIMIT 1
    `, args.repositoryId, args.revisionSha ?? null));
    return rows[0] ?? null;
}
async function listRepositoryRevisions(repositoryId) {
    const prisma = (0, prisma_1.getPrisma)();
    return (await prisma.$queryRawUnsafe(`
      SELECT "id", "repositoryId", "revisionSha", "indexedAt"
      FROM "RepositoryRevision"
      WHERE "repositoryId" = $1
      ORDER BY "indexedAt" DESC
    `, repositoryId));
}
async function getRepositoryRevisionStatus(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
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
      WHERE rr."repositoryId" = $1
        AND rr."revisionSha" = $2
      LIMIT 1
    `, args.repositoryId, args.revisionSha));
    return rows[0] ?? null;
}
