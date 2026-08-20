import { describe, expect, it } from 'vitest';
import { parseCodeToRecords } from './treeSitterParser';
import { syncRepository } from '../services/repositorySync';
import { getPrisma } from '../db/prisma';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

type FileRow = {
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

describe('treeSitterParser (unit)', () => {
  it('extracts imports and top-level TS symbols + exports', () => {
    const code = `
      import React, { useState as use } from 'react';

      function foo(a: number) { return a; }

      export class Bar { }
      interface Baz { x: string }
      type T = { y: number };

      export { foo, Bar };
    `;

    const parsed = parseCodeToRecords('src/example.ts', code);

    // Import extraction
    expect(parsed.imports).toEqual(
      expect.arrayContaining([
        { module: 'react', specifiers: ['React', 'useState'] }
      ])
    );

    // Symbol extraction (non-exported + exported)
    const symbolNames = parsed.symbols.map((s) => s.name);
    expect(symbolNames).toEqual(
      expect.arrayContaining(['foo', 'Bar', 'Baz', 'T'])
    );

    // Export extraction (at least class + re-export list)
    const exportNames = parsed.exports.map((e) => e.name);
    expect(exportNames).toEqual(expect.arrayContaining(['Bar', 'foo']));
  });

  it('extracts FastAPI-style Python imports and symbols', () => {
    const code = `
from fastapi import FastAPI
from .db import SessionLocal

@app.get("/")
def read_root():
    return SessionLocal()

class Settings:
    debug = True
`;
    const parsed = parseCodeToRecords('app/main.py', code);
    expect(parsed.imports).toEqual(
      expect.arrayContaining([
        { module: 'fastapi', specifiers: ['FastAPI'] },
        { module: '.db', specifiers: ['SessionLocal'] }
      ])
    );
    expect(parsed.symbols.map((s) => s.name)).toEqual(
      expect.arrayContaining(['read_root', 'Settings'])
    );
  });

  it('extracts Go imports and functions', () => {
    const code = `
package auth

import (
  "fmt"
  "github.com/org/repo/internal/db"
)

func Login() error {
  return db.Open()
}

type User struct {
  Name string
}
`;
    const parsed = parseCodeToRecords('internal/auth/login.go', code);
    expect(parsed.imports.map((i) => i.module)).toEqual(
      expect.arrayContaining(['fmt', 'github.com/org/repo/internal/db'])
    );
    expect(parsed.symbols.map((s) => s.name)).toEqual(
      expect.arrayContaining(['Login', 'User'])
    );
  });
});

describe('Phase 2 persistence (integration, optional)', () => {
  it('sync-repo parses and persists file/symbol/import/export rows', async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    if (!testDbUrl) {
      console.warn('Skipping integration test: set TEST_DATABASE_URL to enable.');
      return;
    }

    process.env.DATABASE_URL = testDbUrl;
    const prisma = getPrisma();
    await ensurePhase5Tables();

    // NOTE: migrations/seeding are expected to be in place when this env var is set.
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repopilot-phase2-'));
    const repoId = randomUUID();
    const revisionSha = 'phase2-test-sha';

    const fileRelPath = 'src/example.ts';
    const fileAbsPath = path.join(tmpDir, fileRelPath);
    await fs.mkdir(path.dirname(fileAbsPath), { recursive: true });

    await fs.writeFile(
      fileAbsPath,
      `
        import React from 'react';
        export function hello() { return 1; }
      `
    );

    await syncRepository({
      repositoryId: repoId,
      repoPath: tmpDir,
      revisionSha,
      repositoryName: 'tmp-fixture',
      owner: 'test'
    });

    const fileRows = (await prisma.$queryRawUnsafe(
      `
        SELECT f.id
        FROM "File" f
        JOIN "RepositoryRevision" rr ON rr.id = f."revisionId"
        WHERE f."repositoryId" = $1
          AND rr."revisionSha" = $2
          AND f."path" = $3
        LIMIT 1
      `,
      repoId,
      revisionSha,
      fileRelPath
    )) as FileRow[];
    const file = fileRows[0];
    expect(file).toBeTruthy();
    if (!file) return;

    const symbolCount = await prisma.symbol.count({ where: { fileId: file.id } });
    expect(symbolCount).toBeGreaterThan(0);

    const importCount = await prisma.fileImport.count({ where: { fileId: file.id } });
    expect(importCount).toBeGreaterThan(0);
  });
});

