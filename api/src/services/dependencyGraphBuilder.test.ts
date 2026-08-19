import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getPrisma } from '../db/prisma';
import { syncRepository } from './repositorySync';
import { buildDependencyGraph } from './dependencyGraphBuilder';
import { getSymbolDependencyTraversal } from './dependencyGraphQueries';
import { getRepositoryRevisionStatus } from './repositoryRevisions';

type SymbolIdRow = {
  id: string;
};

async function ensurePhase5Tables() {
  const prisma = getPrisma();

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CodeChunk" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "repositoryId" UUID NOT NULL,
      "revisionId" UUID NOT NULL,
      "fileId" UUID NOT NULL,
      "filePath" TEXT NOT NULL,
      "startLine" INTEGER NOT NULL,
      "endLine" INTEGER NOT NULL,
      "chunkType" TEXT NOT NULL DEFAULT 'lines',
      "text" TEXT NOT NULL,
      "embedding" vector(1536),
      "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED,
      CONSTRAINT "CodeChunk_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CodeChunk_repositoryId_fkey"
        FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE,
      CONSTRAINT "CodeChunk_revisionId_fkey"
        FOREIGN KEY ("revisionId") REFERENCES "RepositoryRevision"("id") ON DELETE CASCADE,
      CONSTRAINT "CodeChunk_fileId_fkey"
        FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "CodeChunk_revisionId_filePath_startLine_endLine_key"
      ON "CodeChunk"("revisionId", "filePath", "startLine", "endLine")
  `);
}

describe('dependencyGraphBuilder (integration, optional)', () => {
  it('builds symbol and module dependency edges from synced repository data', async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    if (!testDbUrl) {
      console.warn('Skipping integration test: set TEST_DATABASE_URL to enable.');
      return;
    }

    process.env.DATABASE_URL = testDbUrl;
    await ensurePhase5Tables();

    const prisma = getPrisma();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repopilot-phase3-'));
    const repoId = randomUUID();
    const revisionSha = 'phase4-graph-sha';

    const files = [
      {
        relPath: 'src/B.ts',
        code: `export function B() { return 1; }`
      },
      {
        relPath: 'src/A.ts',
        code: `
          import { B as AliasB } from './B';
          export function A() { return AliasB(); }
        `
      },
      {
        relPath: 'src/CycleA.ts',
        code: `
          import { CycleB } from './CycleB';
          export function CycleA() { return CycleB(); }
        `
      },
      {
        relPath: 'src/CycleB.ts',
        code: `
          import { CycleA } from './CycleA';
          export function CycleB() { return CycleA(); }
        `
      }
    ];

    for (const file of files) {
      const absPath = path.join(tmpDir, file.relPath);
      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, file.code);
    }

    await syncRepository({
      repositoryId: repoId,
      repoPath: tmpDir,
      revisionSha,
      repositoryName: 'phase3-fixture',
      owner: 'test'
    });

    const buildResult = await buildDependencyGraph({
      repositoryId: repoId,
      revisionSha
    });
    expect(buildResult.symbolEdgesAdded).toBeGreaterThan(0);
    expect(buildResult.moduleEdgesAdded).toBeGreaterThan(0);
    expect(buildResult.cyclesDetected).toBeGreaterThan(0);

    const symbolEdges = (await prisma.$queryRawUnsafe(
      `
        SELECT fs.name AS "fromName", ts.name AS "toName"
        FROM "SymbolDependency" sd
        JOIN "Symbol" fs ON fs.id = sd."fromSymbolId"
        JOIN "Symbol" ts ON ts.id = sd."toSymbolId"
        JOIN "File" f ON f.id = fs."fileId"
        WHERE f."repositoryId" = $1
          AND sd."revisionId" = $2
      `,
      repoId,
      buildResult.revisionId
    )) as Array<{ fromName: string; toName: string }>;

    expect(symbolEdges).toEqual(
      expect.arrayContaining([{ fromName: 'A', toName: 'B' }])
    );

    const bSymbolRows = (await prisma.$queryRawUnsafe(
      `
        SELECT s.id
        FROM "Symbol" s
        JOIN "File" f ON f.id = s."fileId"
        WHERE f."repositoryId" = $1
          AND f."revisionId" = $2
          AND s.name = 'B'
        LIMIT 1
      `,
      repoId,
      buildResult.revisionId
    )) as SymbolIdRow[];

    const traversal = await getSymbolDependencyTraversal({
      repositoryId: repoId,
      symbolId: bSymbolRows[0].id,
      revisionSha,
      depthLimit: 2
    });

    expect(traversal?.directCallers.map((node: { name: string }) => node.name)).toContain('A');

    const moduleEdges = (await prisma.$queryRawUnsafe(
      `
        SELECT "fromModule", "toModule"
        FROM "ModuleDependency"
        WHERE "revisionId" = $1
      `,
      buildResult.revisionId
    )) as Array<{ fromModule: string; toModule: string }>;

    expect(moduleEdges).toEqual(
      expect.arrayContaining([{ fromModule: 'src/A.ts', toModule: 'src/B.ts' }])
    );

    await syncRepository({
      repositoryId: repoId,
      repoPath: tmpDir,
      revisionSha,
      repositoryName: 'phase3-fixture',
      owner: 'test'
    });

    const revisionRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*)::int AS count
        FROM "RepositoryRevision"
        WHERE "repositoryId" = $1
          AND "revisionSha" = $2
      `,
      repoId,
      revisionSha
    )) as Array<{ count: number }>;
    expect(revisionRows[0]?.count).toBe(1);

    const revisionStatus = await getRepositoryRevisionStatus({
      repositoryId: repoId,
      revisionSha
    });
    expect(revisionStatus?.fileCount).toBe(files.length);
  });
});
