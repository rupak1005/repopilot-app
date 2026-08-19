import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getPrisma } from '../db/prisma';
import { syncRepository } from './repositorySync';
import { chunkText, searchRepository } from './searchIndex';

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

describe('searchIndex (unit)', () => {
  it('chunks long text with overlap', () => {
    const input = Array.from({ length: 90 }, (_, idx) => `line ${idx + 1}`).join('\n');
    const chunks = chunkText(input);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      startLine: 1,
      endLine: 40
    });
    expect(chunks[1].startLine).toBeLessThan(chunks[0].endLine);
  });
});

describe('searchIndex (integration, optional)', () => {
  it('returns relevant chunks for a repository query', async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    if (!testDbUrl) {
      console.warn('Skipping integration test: set TEST_DATABASE_URL to enable.');
      return;
    }

    process.env.DATABASE_URL = testDbUrl;
    await ensurePhase5Tables();

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repopilot-phase5-'));
    const repoId = randomUUID();
    const revisionSha = 'phase5-search-sha';

    const fileRelPath = 'src/auth.ts';
    const fileAbsPath = path.join(tmpDir, fileRelPath);
    await fs.mkdir(path.dirname(fileAbsPath), { recursive: true });
    await fs.writeFile(
      fileAbsPath,
      `
        export function authenticateUser(email: string, password: string) {
          return email.length > 0 && password.length > 0;
        }

        export function logoutUser() {
          return true;
        }
      `
    );

    await syncRepository({
      repositoryId: repoId,
      repoPath: tmpDir,
      revisionSha,
      repositoryName: 'phase5-fixture',
      owner: 'test'
    });

    const response = await searchRepository({
      repositoryId: repoId,
      revisionSha,
      query: 'authenticate user login',
      topK: 3
    });

    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0]?.file).toBe(fileRelPath);
  });
});
