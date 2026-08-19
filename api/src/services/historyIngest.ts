import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import { getPrisma } from '../db/prisma';

const execFileAsync = promisify(execFile);

export type ParsedCommit = {
  sha: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  message: string;
  files: Array<{
    filePath: string;
    changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  }>;
};

export type HistoryIngestResult = {
  repositoryId: string;
  commitsIngested: number;
  fileChangesIngested: number;
  coChangePairsUpdated: number;
  hotspotsUpdated: number;
  lastProcessedSha: string | null;
};

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...fields }));
}

export function parseGitLogOutput(output: string): ParsedCommit[] {
  const commits: ParsedCommit[] = [];
  let current: ParsedCommit | null = null;

  for (const rawLine of output.split('\n')) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    if (line.startsWith('COMMIT|')) {
      if (current) commits.push(current);
      const [, sha, authorName, authorEmail, authoredAt, ...messageParts] = line.split('|');
      current = {
        sha: sha ?? '',
        authorName: authorName ?? '',
        authorEmail: authorEmail ?? '',
        authoredAt: authoredAt ?? new Date().toISOString(),
        message: messageParts.join('|'),
        files: []
      };
      continue;
    }

    if (!current) continue;

    const statusMatch = line.match(/^([AMDRT])\t(.+)$/);
    if (!statusMatch) continue;

    const code = statusMatch[1];
    const filePath = statusMatch[2];
    let changeType: ParsedCommit['files'][number]['changeType'] = 'modified';
    if (code === 'A') changeType = 'added';
    else if (code === 'D') changeType = 'deleted';
    else if (code === 'R') changeType = 'renamed';

    current.files.push({ filePath, changeType });
  }

  if (current) commits.push(current);
  return commits.filter((commit) => commit.sha);
}

export function coChangePairsForCommit(
  filePaths: string[],
  maxFiles = 20
): Array<[string, string]> {
  const unique = Array.from(new Set(filePaths)).sort().slice(0, maxFiles);
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      pairs.push([unique[i], unique[j]]);
    }
  }
  return pairs;
}

export function computeHotspotScore(args: {
  changeCount: number;
  dependentCount: number;
  coChangeCount: number;
  findingsCount: number;
}): number {
  return (
    args.changeCount *
    Math.log(1 + args.dependentCount) *
    (1 + args.coChangeCount) *
    (1 + args.findingsCount)
  );
}

export function hotspotExplanation(args: {
  changeCount: number;
  dependentCount: number;
  coChangeCount: number;
  findingsCount: number;
}): string[] {
  const reasons: string[] = [];
  if (args.changeCount > 0) {
    reasons.push(`Changed ${args.changeCount} time(s) in tracked history.`);
  }
  if (args.dependentCount > 0) {
    reasons.push(`${args.dependentCount} direct module dependent(s).`);
  }
  if (args.coChangeCount > 0) {
    reasons.push(`Co-changed with ${args.coChangeCount} other file pair(s).`);
  }
  if (args.findingsCount > 0) {
    reasons.push(`${args.findingsCount} recurring review finding(s).`);
  }
  return reasons;
}

async function loadLastProcessedSha(repositoryId: string): Promise<string | null> {
  const rows = (await getPrisma().$queryRawUnsafe(
    `
      SELECT "lastProcessedSha"
      FROM "HistoryIngestState"
      WHERE "repositoryId" = $1
      LIMIT 1
    `,
    repositoryId
  )) as Array<{ lastProcessedSha: string | null }>;

  return rows[0]?.lastProcessedSha ?? null;
}

async function fetchGitLog(args: {
  repoPath: string;
  sinceSha?: string | null;
  maxCount?: number;
}): Promise<string> {
  const gitArgs = [
    'log',
    '--name-status',
    '--pretty=format:COMMIT|%H|%an|%ae|%ai|%s'
  ];

  if (args.sinceSha) {
    gitArgs.push(`${args.sinceSha}..HEAD`);
  }

  if (args.maxCount) {
    gitArgs.push('-n', String(args.maxCount));
  }

  const result = await execFileAsync('git', gitArgs, {
    cwd: args.repoPath,
    maxBuffer: 20 * 1024 * 1024
  });

  return result.stdout;
}

async function upsertCommit(args: {
  repositoryId: string;
  commit: ParsedCommit;
}): Promise<{ commitId: string; inserted: boolean }> {
  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
      INSERT INTO "CommitRecord" (
        "repositoryId",
        "sha",
        "authorName",
        "authorEmail",
        "authoredAt",
        "message"
      )
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6)
      ON CONFLICT ("repositoryId", "sha") DO NOTHING
      RETURNING "id"
    `,
    args.repositoryId,
    args.commit.sha,
    args.commit.authorName,
    args.commit.authorEmail,
    args.commit.authoredAt,
    args.commit.message
  )) as Array<{ id: string }>;

  if (rows[0]?.id) {
    return { commitId: rows[0].id, inserted: true };
  }

  const existing = (await prisma.$queryRawUnsafe(
    `
      SELECT "id"
      FROM "CommitRecord"
      WHERE "repositoryId" = $1
        AND "sha" = $2
      LIMIT 1
    `,
    args.repositoryId,
    args.commit.sha
  )) as Array<{ id: string }>;

  return {
    commitId: existing[0]?.id ?? crypto.randomUUID(),
    inserted: false
  };
}

export async function ingestRepositoryHistory(args: {
  repositoryId: string;
  repoPath: string;
  rebuild?: boolean;
  maxCount?: number;
}): Promise<HistoryIngestResult> {
  const prisma = getPrisma();
  const startedAt = Date.now();

  if (args.rebuild) {
    await prisma.$executeRawUnsafe(
      `
        DELETE FROM "CoChangePair" WHERE "repositoryId" = $1;
        DELETE FROM "ModuleHotspot" WHERE "repositoryId" = $1;
        DELETE FROM "CommitFileChange"
        WHERE "commitId" IN (
          SELECT "id" FROM "CommitRecord" WHERE "repositoryId" = $1
        );
        DELETE FROM "CommitRecord" WHERE "repositoryId" = $1;
        DELETE FROM "HistoryIngestState" WHERE "repositoryId" = $1;
      `,
      args.repositoryId
    );
  }

  const sinceSha = args.rebuild ? null : await loadLastProcessedSha(args.repositoryId);
  logEvent('history.ingest.started', {
    repositoryId: args.repositoryId,
    sinceSha,
    rebuild: args.rebuild === true
  });

  const output = await fetchGitLog({
    repoPath: args.repoPath,
    sinceSha,
    maxCount: args.maxCount
  });
  const commits = parseGitLogOutput(output);

  let commitsIngested = 0;
  let fileChangesIngested = 0;
  let coChangePairsUpdated = 0;

  for (const commit of commits) {
    const { commitId, inserted } = await upsertCommit({
      repositoryId: args.repositoryId,
      commit
    });
    if (!inserted) continue;

    commitsIngested += 1;
    for (const file of commit.files) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "CommitFileChange" (
            "commitId",
            "filePath",
            "changeType"
          )
          VALUES ($1, $2, $3)
        `,
        commitId,
        file.filePath,
        file.changeType
      );
      fileChangesIngested += 1;
    }

    const pairs = coChangePairsForCommit(commit.files.map((file) => file.filePath));
    for (const [fileA, fileB] of pairs) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO "CoChangePair" ("repositoryId", "fileA", "fileB", "count")
          VALUES ($1, $2, $3, 1)
          ON CONFLICT ("repositoryId", "fileA", "fileB")
          DO UPDATE SET "count" = "CoChangePair"."count" + 1
        `,
        args.repositoryId,
        fileA,
        fileB
      );
      coChangePairsUpdated += 1;
    }
  }

  const latestSha = commits[0]?.sha ?? sinceSha ?? null;
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "HistoryIngestState" ("repositoryId", "lastProcessedSha", "updatedAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT ("repositoryId")
      DO UPDATE SET
        "lastProcessedSha" = EXCLUDED."lastProcessedSha",
        "updatedAt" = NOW()
    `,
    args.repositoryId,
    latestSha
  );

  const hotspotsUpdated = await recomputeModuleHotspots(args.repositoryId);

  logEvent('history.ingest.completed', {
    repositoryId: args.repositoryId,
    commitsIngested,
    fileChangesIngested,
    coChangePairsUpdated,
    hotspotsUpdated,
    latencyMs: Date.now() - startedAt
  });

  return {
    repositoryId: args.repositoryId,
    commitsIngested,
    fileChangesIngested,
    coChangePairsUpdated,
    hotspotsUpdated,
    lastProcessedSha: latestSha
  };
}

export async function recomputeModuleHotspots(repositoryId: string): Promise<number> {
  const prisma = getPrisma();

  const revisionRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "id"
      FROM "RepositoryRevision"
      WHERE "repositoryId" = $1
      ORDER BY "indexedAt" DESC
      LIMIT 1
    `,
    repositoryId
  )) as Array<{ id: string }>;
  const revisionId = revisionRows[0]?.id ?? null;

  const fileStats = (await prisma.$queryRawUnsafe(
    `
      SELECT
        cfc."filePath" AS "filePath",
        COUNT(*)::int AS "changeCount"
      FROM "CommitFileChange" cfc
      JOIN "CommitRecord" cr ON cr."id" = cfc."commitId"
      WHERE cr."repositoryId" = $1
        AND cr."authoredAt" > NOW() - INTERVAL '30 days'
      GROUP BY cfc."filePath"
    `,
    repositoryId
  )) as Array<{ filePath: string; changeCount: number }>;

  await prisma.$executeRawUnsafe(
    `
      DELETE FROM "ModuleHotspot"
      WHERE "repositoryId" = $1
    `,
    repositoryId
  );

  let updated = 0;
  for (const stat of fileStats) {
    const dependentRows = revisionId
      ? ((await prisma.$queryRawUnsafe(
          `
            SELECT COUNT(DISTINCT "fromModule")::int AS count
            FROM "ModuleDependency"
            WHERE "revisionId" = $1
              AND "toModule" = $2
          `,
          revisionId,
          stat.filePath
        )) as Array<{ count: number }>)
      : [{ count: 0 }];

    const coChangeRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COALESCE(SUM("count"), 0)::int AS count
        FROM "CoChangePair"
        WHERE "repositoryId" = $1
          AND ("fileA" = $2 OR "fileB" = $2)
      `,
      repositoryId,
      stat.filePath
    )) as Array<{ count: number }>;

    const findingsRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*)::int AS count
        FROM "ReviewEvidence" ev
        JOIN "ReviewFinding" f ON f."id" = ev."findingId"
        JOIN "PullRequestReview" r ON r."id" = f."reviewId"
        JOIN "PullRequest" p ON p."id" = r."pullRequestId"
        WHERE p."repositoryId" = $1
          AND ev."filePath" = $2
      `,
      repositoryId,
      stat.filePath
    )) as Array<{ count: number }>;

    const dependentCount = dependentRows[0]?.count ?? 0;
    const coChangeCount = coChangeRows[0]?.count ?? 0;
    const findingsCount = findingsRows[0]?.count ?? 0;
    const score = computeHotspotScore({
      changeCount: stat.changeCount,
      dependentCount,
      coChangeCount,
      findingsCount
    });
    const reasons = hotspotExplanation({
      changeCount: stat.changeCount,
      dependentCount,
      coChangeCount,
      findingsCount
    });

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "ModuleHotspot" (
          "repositoryId",
          "filePath",
          "score",
          "changeCount",
          "dependentCount",
          "coChangeCount",
          "findingsCount",
          "reasons",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
      `,
      repositoryId,
      stat.filePath,
      score,
      stat.changeCount,
      dependentCount,
      coChangeCount,
      findingsCount,
      JSON.stringify(reasons)
    );
    updated += 1;
  }

  return updated;
}
