"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../db/prisma");
const repositorySync_1 = require("./repositorySync");
const dependencyGraphBuilder_1 = require("./dependencyGraphBuilder");
const dependencyGraphQueries_1 = require("./dependencyGraphQueries");
const repositoryRevisions_1 = require("./repositoryRevisions");
async function ensurePhase5Tables() {
    const prisma = (0, prisma_1.getPrisma)();
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
(0, vitest_1.describe)('dependencyGraphBuilder (integration, optional)', () => {
    (0, vitest_1.it)('builds symbol and module dependency edges from synced repository data', async () => {
        const testDbUrl = process.env.TEST_DATABASE_URL;
        if (!testDbUrl) {
            console.warn('Skipping integration test: set TEST_DATABASE_URL to enable.');
            return;
        }
        process.env.DATABASE_URL = testDbUrl;
        await ensurePhase5Tables();
        const prisma = (0, prisma_1.getPrisma)();
        const tmpDir = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'repopilot-phase3-'));
        const repoId = (0, node_crypto_1.randomUUID)();
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
            const absPath = node_path_1.default.join(tmpDir, file.relPath);
            await promises_1.default.mkdir(node_path_1.default.dirname(absPath), { recursive: true });
            await promises_1.default.writeFile(absPath, file.code);
        }
        await (0, repositorySync_1.syncRepository)({
            repositoryId: repoId,
            repoPath: tmpDir,
            revisionSha,
            repositoryName: 'phase3-fixture',
            owner: 'test'
        });
        const buildResult = await (0, dependencyGraphBuilder_1.buildDependencyGraph)({
            repositoryId: repoId,
            revisionSha
        });
        (0, vitest_1.expect)(buildResult.symbolEdgesAdded).toBeGreaterThan(0);
        (0, vitest_1.expect)(buildResult.moduleEdgesAdded).toBeGreaterThan(0);
        (0, vitest_1.expect)(buildResult.cyclesDetected).toBeGreaterThan(0);
        const symbolEdges = (await prisma.$queryRawUnsafe(`
        SELECT fs.name AS "fromName", ts.name AS "toName"
        FROM "SymbolDependency" sd
        JOIN "Symbol" fs ON fs.id = sd."fromSymbolId"
        JOIN "Symbol" ts ON ts.id = sd."toSymbolId"
        JOIN "File" f ON f.id = fs."fileId"
        WHERE f."repositoryId" = $1
          AND sd."revisionId" = $2
      `, repoId, buildResult.revisionId));
        (0, vitest_1.expect)(symbolEdges).toEqual(vitest_1.expect.arrayContaining([{ fromName: 'A', toName: 'B' }]));
        const bSymbolRows = (await prisma.$queryRawUnsafe(`
        SELECT s.id
        FROM "Symbol" s
        JOIN "File" f ON f.id = s."fileId"
        WHERE f."repositoryId" = $1
          AND f."revisionId" = $2
          AND s.name = 'B'
        LIMIT 1
      `, repoId, buildResult.revisionId));
        const traversal = await (0, dependencyGraphQueries_1.getSymbolDependencyTraversal)({
            repositoryId: repoId,
            symbolId: bSymbolRows[0].id,
            revisionSha,
            depthLimit: 2
        });
        (0, vitest_1.expect)(traversal?.directCallers.map((node) => node.name)).toContain('A');
        const moduleEdges = (await prisma.$queryRawUnsafe(`
        SELECT "fromModule", "toModule"
        FROM "ModuleDependency"
        WHERE "revisionId" = $1
      `, buildResult.revisionId));
        (0, vitest_1.expect)(moduleEdges).toEqual(vitest_1.expect.arrayContaining([{ fromModule: 'src/A.ts', toModule: 'src/B.ts' }]));
        await (0, repositorySync_1.syncRepository)({
            repositoryId: repoId,
            repoPath: tmpDir,
            revisionSha,
            repositoryName: 'phase3-fixture',
            owner: 'test'
        });
        const revisionRows = (await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS count
        FROM "RepositoryRevision"
        WHERE "repositoryId" = $1
          AND "revisionSha" = $2
      `, repoId, revisionSha));
        (0, vitest_1.expect)(revisionRows[0]?.count).toBe(1);
        const revisionStatus = await (0, repositoryRevisions_1.getRepositoryRevisionStatus)({
            repositoryId: repoId,
            revisionSha
        });
        (0, vitest_1.expect)(revisionStatus?.fileCount).toBe(files.length);
    });
});
