import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getPrisma } from '../db/prisma';
import { syncRepository } from './repositorySync';
import { buildDependencyGraph } from './dependencyGraphBuilder';
import { getSymbolDependencyTraversal } from './dependencyGraphQueries';

type SymbolIdRow = {
  id: string;
};

async function ensurePhase3Tables() {
  const prisma = getPrisma();

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SymbolDependency" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "fromSymbolId" UUID NOT NULL,
      "toSymbolId" UUID NOT NULL,
      CONSTRAINT "SymbolDependency_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "SymbolDependency_fromSymbolId_fkey"
        FOREIGN KEY ("fromSymbolId") REFERENCES "Symbol"("id") ON DELETE CASCADE,
      CONSTRAINT "SymbolDependency_toSymbolId_fkey"
        FOREIGN KEY ("toSymbolId") REFERENCES "Symbol"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "SymbolDependency_fromSymbolId_toSymbolId_key"
      ON "SymbolDependency"("fromSymbolId", "toSymbolId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SymbolDependency_fromSymbolId_idx"
      ON "SymbolDependency"("fromSymbolId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SymbolDependency_toSymbolId_idx"
      ON "SymbolDependency"("toSymbolId")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ModuleDependency" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "repositoryId" UUID NOT NULL,
      "fromModule" TEXT NOT NULL,
      "toModule" TEXT NOT NULL,
      CONSTRAINT "ModuleDependency_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ModuleDependency_repositoryId_fkey"
        FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ModuleDependency_repositoryId_fromModule_toModule_key"
      ON "ModuleDependency"("repositoryId", "fromModule", "toModule")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ModuleDependency_repositoryId_idx"
      ON "ModuleDependency"("repositoryId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ModuleDependency_toModule_idx"
      ON "ModuleDependency"("toModule")
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
    await ensurePhase3Tables();

    const prisma = getPrisma();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repopilot-phase3-'));
    const repoId = randomUUID();

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
      repositoryName: 'phase3-fixture',
      owner: 'test'
    });

    const buildResult = await buildDependencyGraph({ repositoryId: repoId });
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
      `,
      repoId
    )) as Array<{ fromName: string; toName: string }>;

    expect(symbolEdges).toEqual(
      expect.arrayContaining([{ fromName: 'A', toName: 'B' }])
    );

    const bSymbolRows = (await prisma.$queryRawUnsafe(
      `
        SELECT s.id
        FROM "Symbol" s
        JOIN "File" f ON f.id = s."fileId"
        WHERE f."repositoryId" = $1 AND s.name = 'B'
        LIMIT 1
      `,
      repoId
    )) as SymbolIdRow[];

    const traversal = await getSymbolDependencyTraversal({
      repositoryId: repoId,
      symbolId: bSymbolRows[0].id,
      depthLimit: 2
    });

    expect(traversal?.directCallers.map((node: { name: string }) => node.name)).toContain('A');

    const moduleEdges = (await prisma.$queryRawUnsafe(
      `
        SELECT "fromModule", "toModule"
        FROM "ModuleDependency"
        WHERE "repositoryId" = $1
      `,
      repoId
    )) as Array<{ fromModule: string; toModule: string }>;

    expect(moduleEdges).toEqual(
      expect.arrayContaining([{ fromModule: 'src/A.ts', toModule: 'src/B.ts' }])
    );
  });
});
