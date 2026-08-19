"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitLogOutput = parseGitLogOutput;
exports.coChangePairsForCommit = coChangePairsForCommit;
exports.computeHotspotScore = computeHotspotScore;
exports.hotspotExplanation = hotspotExplanation;
exports.ingestRepositoryHistory = ingestRepositoryHistory;
exports.recomputeModuleHotspots = recomputeModuleHotspots;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const node_crypto_1 = __importDefault(require("node:crypto"));
const prisma_1 = require("../db/prisma");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
function logEvent(event, fields) {
    console.log(JSON.stringify({ event, ...fields }));
}
function parseGitLogOutput(output) {
    const commits = [];
    let current = null;
    for (const rawLine of output.split('\n')) {
        const line = rawLine.trimEnd();
        if (!line)
            continue;
        if (line.startsWith('COMMIT|')) {
            if (current)
                commits.push(current);
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
        if (!current)
            continue;
        const statusMatch = line.match(/^([AMDRT])\t(.+)$/);
        if (!statusMatch)
            continue;
        const code = statusMatch[1];
        const filePath = statusMatch[2];
        let changeType = 'modified';
        if (code === 'A')
            changeType = 'added';
        else if (code === 'D')
            changeType = 'deleted';
        else if (code === 'R')
            changeType = 'renamed';
        current.files.push({ filePath, changeType });
    }
    if (current)
        commits.push(current);
    return commits.filter((commit) => commit.sha);
}
function coChangePairsForCommit(filePaths, maxFiles = 20) {
    const unique = Array.from(new Set(filePaths)).sort().slice(0, maxFiles);
    const pairs = [];
    for (let i = 0; i < unique.length; i += 1) {
        for (let j = i + 1; j < unique.length; j += 1) {
            pairs.push([unique[i], unique[j]]);
        }
    }
    return pairs;
}
function computeHotspotScore(args) {
    return (args.changeCount *
        Math.log(1 + args.dependentCount) *
        (1 + args.coChangeCount) *
        (1 + args.findingsCount));
}
function hotspotExplanation(args) {
    const reasons = [];
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
async function loadLastProcessedSha(repositoryId) {
    const rows = (await (0, prisma_1.getPrisma)().$queryRawUnsafe(`
      SELECT "lastProcessedSha"
      FROM "HistoryIngestState"
      WHERE "repositoryId" = $1
      LIMIT 1
    `, repositoryId));
    return rows[0]?.lastProcessedSha ?? null;
}
async function fetchGitLog(args) {
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
async function upsertCommit(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const rows = (await prisma.$queryRawUnsafe(`
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
    `, args.repositoryId, args.commit.sha, args.commit.authorName, args.commit.authorEmail, args.commit.authoredAt, args.commit.message));
    if (rows[0]?.id) {
        return { commitId: rows[0].id, inserted: true };
    }
    const existing = (await prisma.$queryRawUnsafe(`
      SELECT "id"
      FROM "CommitRecord"
      WHERE "repositoryId" = $1
        AND "sha" = $2
      LIMIT 1
    `, args.repositoryId, args.commit.sha));
    return {
        commitId: existing[0]?.id ?? node_crypto_1.default.randomUUID(),
        inserted: false
    };
}
async function ingestRepositoryHistory(args) {
    const prisma = (0, prisma_1.getPrisma)();
    const startedAt = Date.now();
    if (args.rebuild) {
        await prisma.$executeRawUnsafe(`
        DELETE FROM "CoChangePair" WHERE "repositoryId" = $1;
        DELETE FROM "ModuleHotspot" WHERE "repositoryId" = $1;
        DELETE FROM "CommitFileChange"
        WHERE "commitId" IN (
          SELECT "id" FROM "CommitRecord" WHERE "repositoryId" = $1
        );
        DELETE FROM "CommitRecord" WHERE "repositoryId" = $1;
        DELETE FROM "HistoryIngestState" WHERE "repositoryId" = $1;
      `, args.repositoryId);
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
        if (!inserted)
            continue;
        commitsIngested += 1;
        for (const file of commit.files) {
            await prisma.$executeRawUnsafe(`
          INSERT INTO "CommitFileChange" (
            "commitId",
            "filePath",
            "changeType"
          )
          VALUES ($1, $2, $3)
        `, commitId, file.filePath, file.changeType);
            fileChangesIngested += 1;
        }
        const pairs = coChangePairsForCommit(commit.files.map((file) => file.filePath));
        for (const [fileA, fileB] of pairs) {
            await prisma.$executeRawUnsafe(`
          INSERT INTO "CoChangePair" ("repositoryId", "fileA", "fileB", "count")
          VALUES ($1, $2, $3, 1)
          ON CONFLICT ("repositoryId", "fileA", "fileB")
          DO UPDATE SET "count" = "CoChangePair"."count" + 1
        `, args.repositoryId, fileA, fileB);
            coChangePairsUpdated += 1;
        }
    }
    const latestSha = commits[0]?.sha ?? sinceSha ?? null;
    await prisma.$executeRawUnsafe(`
      INSERT INTO "HistoryIngestState" ("repositoryId", "lastProcessedSha", "updatedAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT ("repositoryId")
      DO UPDATE SET
        "lastProcessedSha" = EXCLUDED."lastProcessedSha",
        "updatedAt" = NOW()
    `, args.repositoryId, latestSha);
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
async function recomputeModuleHotspots(repositoryId) {
    const prisma = (0, prisma_1.getPrisma)();
    const revisionRows = (await prisma.$queryRawUnsafe(`
      SELECT "id"
      FROM "RepositoryRevision"
      WHERE "repositoryId" = $1
      ORDER BY "indexedAt" DESC
      LIMIT 1
    `, repositoryId));
    const revisionId = revisionRows[0]?.id ?? null;
    const fileStats = (await prisma.$queryRawUnsafe(`
      SELECT
        cfc."filePath" AS "filePath",
        COUNT(*)::int AS "changeCount"
      FROM "CommitFileChange" cfc
      JOIN "CommitRecord" cr ON cr."id" = cfc."commitId"
      WHERE cr."repositoryId" = $1
        AND cr."authoredAt" > NOW() - INTERVAL '30 days'
      GROUP BY cfc."filePath"
    `, repositoryId));
    await prisma.$executeRawUnsafe(`
      DELETE FROM "ModuleHotspot"
      WHERE "repositoryId" = $1
    `, repositoryId);
    let updated = 0;
    for (const stat of fileStats) {
        const dependentRows = revisionId
            ? (await prisma.$queryRawUnsafe(`
            SELECT COUNT(DISTINCT "fromModule")::int AS count
            FROM "ModuleDependency"
            WHERE "revisionId" = $1
              AND "toModule" = $2
          `, revisionId, stat.filePath))
            : [{ count: 0 }];
        const coChangeRows = (await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM("count"), 0)::int AS count
        FROM "CoChangePair"
        WHERE "repositoryId" = $1
          AND ("fileA" = $2 OR "fileB" = $2)
      `, repositoryId, stat.filePath));
        const findingsRows = (await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS count
        FROM "ReviewEvidence" ev
        JOIN "ReviewFinding" f ON f."id" = ev."findingId"
        JOIN "PullRequestReview" r ON r."id" = f."reviewId"
        JOIN "PullRequest" p ON p."id" = r."pullRequestId"
        WHERE p."repositoryId" = $1
          AND ev."filePath" = $2
      `, repositoryId, stat.filePath));
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
        await prisma.$executeRawUnsafe(`
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
      `, repositoryId, stat.filePath, score, stat.changeCount, dependentCount, coChangeCount, findingsCount, JSON.stringify(reasons));
        updated += 1;
    }
    return updated;
}
