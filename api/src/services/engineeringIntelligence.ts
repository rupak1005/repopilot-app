import { filePathFromNodeId } from '@repopilot/common';
import { getPrisma } from '../db/prisma';
import { getModuleArchitectureGraph } from './contextGraph';
import { resolveRepositoryRevision } from './repositoryRevisions';

export type HotspotResult = {
  filePath: string;
  score: number;
  changeCount: number;
  dependentCount: number;
  coChangeCount: number;
  findingsCount: number;
  reasons: string[];
};

export type CoChangeResult = {
  file: string;
  pairedWith: string;
  count: number;
};

export type HistorySearchResult = {
  type: 'commit' | 'pull_request';
  id: string;
  title: string;
  snippet: string;
  authoredAt?: string;
};

export type SimilarChangeResult = {
  pullNumber: number;
  title: string;
  overlapFiles: string[];
  overlapCount: number;
};

export type ArchitectureNode = {
  filePath: string;
  isHotspot: boolean;
  score: number;
};

export type ArchitectureEdge = {
  fromModule: string;
  toModule: string;
  kind?: string;
  confidence?: number;
};

export async function listModuleHotspots(args: {
  repositoryId: string;
  topK?: number;
}): Promise<HotspotResult[]> {
  const topK = Math.max(1, args.topK ?? 10);
  const rows = (await getPrisma().$queryRawUnsafe(
    `
      SELECT
        "filePath",
        "score",
        "changeCount",
        "dependentCount",
        "coChangeCount",
        "findingsCount",
        "reasons"
      FROM "ModuleHotspot"
      WHERE "repositoryId" = $1
      ORDER BY "score" DESC
      LIMIT $2
    `,
    args.repositoryId,
    topK
  )) as Array<{
    filePath: string;
    score: number;
    changeCount: number;
    dependentCount: number;
    coChangeCount: number;
    findingsCount: number;
    reasons: string[];
  }>;

  return rows.map((row) => ({
    filePath: row.filePath,
    score: row.score,
    changeCount: row.changeCount,
    dependentCount: row.dependentCount,
    coChangeCount: row.coChangeCount,
    findingsCount: row.findingsCount,
    reasons: Array.isArray(row.reasons) ? row.reasons : []
  }));
}

export async function getCoChanges(args: {
  repositoryId: string;
  filePath: string;
  topK?: number;
}): Promise<CoChangeResult[]> {
  const topK = Math.max(1, args.topK ?? 10);
  const rows = (await getPrisma().$queryRawUnsafe(
    `
      SELECT
        CASE
          WHEN "fileA" = $2 THEN "fileB"
          ELSE "fileA"
        END AS "pairedWith",
        "count"
      FROM "CoChangePair"
      WHERE "repositoryId" = $1
        AND ($2 = "fileA" OR $2 = "fileB")
      ORDER BY "count" DESC
      LIMIT $3
    `,
    args.repositoryId,
    args.filePath,
    topK
  )) as Array<{ pairedWith: string; count: number }>;

  return rows.map((row) => ({
    file: args.filePath,
    pairedWith: row.pairedWith,
    count: row.count
  }));
}

export async function searchHistory(args: {
  repositoryId: string;
  query: string;
  type?: 'commit' | 'pull_request' | 'all';
  topK?: number;
}): Promise<HistorySearchResult[]> {
  const topK = Math.max(1, args.topK ?? 10);
  const type = args.type ?? 'all';
  const results: HistorySearchResult[] = [];

  if (type === 'commit' || type === 'all') {
    const commitRows = (await getPrisma().$queryRawUnsafe(
      `
        SELECT
          "id",
          "sha",
          "message",
          "authoredAt",
          ts_rank("searchVector", plainto_tsquery('english', $2)) AS rank
        FROM "CommitRecord"
        WHERE "repositoryId" = $1
          AND "searchVector" @@ plainto_tsquery('english', $2)
        ORDER BY rank DESC, "authoredAt" DESC
        LIMIT $3
      `,
      args.repositoryId,
      args.query,
      topK
    )) as Array<{
      id: string;
      sha: string;
      message: string;
      authoredAt: Date;
      rank: number;
    }>;

    for (const row of commitRows) {
      results.push({
        type: 'commit',
        id: row.sha,
        title: row.message.split('\n')[0] ?? row.sha,
        snippet: row.message.slice(0, 240),
        authoredAt: row.authoredAt.toISOString()
      });
    }
  }

  if (type === 'pull_request' || type === 'all') {
    const pullRows = (await getPrisma().$queryRawUnsafe(
      `
        SELECT
          "number",
          "title",
          COALESCE("body", '') AS body,
          "updatedAt"
        FROM "PullRequest"
        WHERE "repositoryId" = $1
          AND (
            "title" ILIKE '%' || $2 || '%'
            OR COALESCE("body", '') ILIKE '%' || $2 || '%'
          )
        ORDER BY "updatedAt" DESC
        LIMIT $3
      `,
      args.repositoryId,
      args.query,
      topK
    )) as Array<{
      number: number;
      title: string;
      body: string;
      updatedAt: Date;
    }>;

    for (const row of pullRows) {
      results.push({
        type: 'pull_request',
        id: String(row.number),
        title: row.title,
        snippet: (row.body || row.title).slice(0, 240),
        authoredAt: row.updatedAt.toISOString()
      });
    }
  }

  return results.slice(0, topK);
}

export async function findSimilarChanges(args: {
  repositoryId: string;
  pullNumber: number;
  topK?: number;
}): Promise<SimilarChangeResult[]> {
  const topK = Math.max(1, args.topK ?? 5);
  const prisma = getPrisma();

  const targetRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "headRevision", "baseRevision"
      FROM "PullRequest"
      WHERE "repositoryId" = $1
        AND "number" = $2
      LIMIT 1
    `,
    args.repositoryId,
    args.pullNumber
  )) as Array<{ headRevision: string; baseRevision: string }>;
  const target = targetRows[0];
  if (!target) return [];

  const headRevision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: target.headRevision
  });
  const baseRevision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: target.baseRevision
  });
  if (!headRevision || !baseRevision) return [];

  const targetFiles = (await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT h."path"
      FROM "File" h
      LEFT JOIN "File" b
        ON b."revisionId" = $2
       AND b."path" = h."path"
       AND b."content" = h."content"
      WHERE h."revisionId" = $1
        AND (b."id" IS NULL)
    `,
    headRevision.id,
    baseRevision.id
  )) as Array<{ path: string }>;

  const targetPaths = new Set(targetFiles.map((row) => row.path));
  if (targetPaths.size === 0) return [];

  const otherPulls = (await prisma.$queryRawUnsafe(
    `
      SELECT "number", "title", "headRevision", "baseRevision"
      FROM "PullRequest"
      WHERE "repositoryId" = $1
        AND "number" <> $2
      ORDER BY "updatedAt" DESC
      LIMIT 20
    `,
    args.repositoryId,
    args.pullNumber
  )) as Array<{
    number: number;
    title: string;
    headRevision: string;
    baseRevision: string;
  }>;

  const results: SimilarChangeResult[] = [];
  for (const pull of otherPulls) {
    const pullHead = await resolveRepositoryRevision({
      repositoryId: args.repositoryId,
      revisionSha: pull.headRevision
    });
    const pullBase = await resolveRepositoryRevision({
      repositoryId: args.repositoryId,
      revisionSha: pull.baseRevision
    });
    if (!pullHead || !pullBase) continue;

    const changedFiles = (await prisma.$queryRawUnsafe(
      `
        SELECT DISTINCT h."path"
        FROM "File" h
        LEFT JOIN "File" b
          ON b."revisionId" = $2
         AND b."path" = h."path"
         AND b."content" = h."content"
        WHERE h."revisionId" = $1
          AND (b."id" IS NULL)
      `,
      pullHead.id,
      pullBase.id
    )) as Array<{ path: string }>;

    const overlapFiles = changedFiles
      .map((row) => row.path)
      .filter((path) => targetPaths.has(path));

    if (overlapFiles.length === 0) continue;

    results.push({
      pullNumber: pull.number,
      title: pull.title,
      overlapFiles,
      overlapCount: overlapFiles.length
    });
  }

  return results.sort((a, b) => b.overlapCount - a.overlapCount).slice(0, topK);
}

export async function getArchitectureGraph(args: {
  repositoryId: string;
  revisionSha?: string;
}): Promise<{ nodes: ArchitectureNode[]; edges: ArchitectureEdge[] }> {
  const slice = await getModuleArchitectureGraph(args);
  return {
    nodes: slice.nodes.map((node) => ({
      filePath: node.filePath ?? filePathFromNodeId(node.id) ?? node.id,
      isHotspot: node.isHotspot ?? false,
      score: node.score ?? 0
    })),
    edges: slice.edges.map((edge) => ({
      fromModule: filePathFromNodeId(edge.from) ?? edge.from,
      toModule: filePathFromNodeId(edge.to) ?? edge.to,
      kind: edge.kind,
      confidence: edge.provenance.confidence
    }))
  };
}

export async function getSymbolChangeHistory(args: {
  repositoryId: string;
  symbolName: string;
  topK?: number;
}): Promise<
  Array<{
    sha: string;
    message: string;
    authoredAt: string;
    filePath: string;
  }>
> {
  const topK = Math.max(1, args.topK ?? 10);
  const rows = (await getPrisma().$queryRawUnsafe(
    `
      SELECT
        cr."sha",
        cr."message",
        cr."authoredAt",
        cfc."filePath"
      FROM "CommitRecord" cr
      JOIN "CommitFileChange" cfc ON cfc."commitId" = cr."id"
      WHERE cr."repositoryId" = $1
        AND (
          cfc."filePath" ILIKE '%' || $2 || '%'
          OR cr."message" ILIKE '%' || $2 || '%'
        )
      ORDER BY cr."authoredAt" DESC
      LIMIT $3
    `,
    args.repositoryId,
    args.symbolName,
    topK
  )) as Array<{
    sha: string;
    message: string;
    authoredAt: Date;
    filePath: string;
  }>;

  return rows.map((row) => ({
    sha: row.sha,
    message: row.message,
    authoredAt: row.authoredAt.toISOString(),
    filePath: row.filePath
  }));
}
