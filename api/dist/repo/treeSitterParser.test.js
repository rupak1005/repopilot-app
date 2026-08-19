"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const treeSitterParser_1 = require("./treeSitterParser");
const repositorySync_1 = require("../services/repositorySync");
const prisma_1 = require("../db/prisma");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
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
(0, vitest_1.describe)('treeSitterParser (unit)', () => {
    (0, vitest_1.it)('extracts imports and top-level TS symbols + exports', () => {
        const code = `
      import React, { useState as use } from 'react';

      function foo(a: number) { return a; }

      export class Bar { }
      interface Baz { x: string }
      type T = { y: number };

      export { foo, Bar };
    `;
        const parsed = (0, treeSitterParser_1.parseCodeToRecords)('src/example.ts', code);
        // Import extraction
        (0, vitest_1.expect)(parsed.imports).toEqual(vitest_1.expect.arrayContaining([
            { module: 'react', specifiers: ['React', 'useState'] }
        ]));
        // Symbol extraction (non-exported + exported)
        const symbolNames = parsed.symbols.map((s) => s.name);
        (0, vitest_1.expect)(symbolNames).toEqual(vitest_1.expect.arrayContaining(['foo', 'Bar', 'Baz', 'T']));
        // Export extraction (at least class + re-export list)
        const exportNames = parsed.exports.map((e) => e.name);
        (0, vitest_1.expect)(exportNames).toEqual(vitest_1.expect.arrayContaining(['Bar', 'foo']));
    });
});
(0, vitest_1.describe)('Phase 2 persistence (integration, optional)', () => {
    (0, vitest_1.it)('sync-repo parses and persists file/symbol/import/export rows', async () => {
        const testDbUrl = process.env.TEST_DATABASE_URL;
        if (!testDbUrl) {
            console.warn('Skipping integration test: set TEST_DATABASE_URL to enable.');
            return;
        }
        process.env.DATABASE_URL = testDbUrl;
        const prisma = (0, prisma_1.getPrisma)();
        await ensurePhase5Tables();
        // NOTE: migrations/seeding are expected to be in place when this env var is set.
        const tmpDir = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'repopilot-phase2-'));
        const repoId = (0, node_crypto_1.randomUUID)();
        const revisionSha = 'phase2-test-sha';
        const fileRelPath = 'src/example.ts';
        const fileAbsPath = node_path_1.default.join(tmpDir, fileRelPath);
        await promises_1.default.mkdir(node_path_1.default.dirname(fileAbsPath), { recursive: true });
        await promises_1.default.writeFile(fileAbsPath, `
        import React from 'react';
        export function hello() { return 1; }
      `);
        await (0, repositorySync_1.syncRepository)({
            repositoryId: repoId,
            repoPath: tmpDir,
            revisionSha,
            repositoryName: 'tmp-fixture',
            owner: 'test'
        });
        const fileRows = (await prisma.$queryRawUnsafe(`
        SELECT f.id
        FROM "File" f
        JOIN "RepositoryRevision" rr ON rr.id = f."revisionId"
        WHERE f."repositoryId" = $1
          AND rr."revisionSha" = $2
          AND f."path" = $3
        LIMIT 1
      `, repoId, revisionSha, fileRelPath));
        const file = fileRows[0];
        (0, vitest_1.expect)(file).toBeTruthy();
        if (!file)
            return;
        const symbolCount = await prisma.symbol.count({ where: { fileId: file.id } });
        (0, vitest_1.expect)(symbolCount).toBeGreaterThan(0);
        const importCount = await prisma.fileImport.count({ where: { fileId: file.id } });
        (0, vitest_1.expect)(importCount).toBeGreaterThan(0);
    });
});
