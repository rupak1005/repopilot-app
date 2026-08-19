import { describe, expect, it } from 'vitest';
import { parseCodeToRecords } from './treeSitterParser';
import { syncRepository } from '../services/repositorySync';
import { getPrisma } from '../db/prisma';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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

    // NOTE: migrations/seeding are expected to be in place when this env var is set.
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repopilot-phase2-'));
    const repoId = randomUUID();

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
      repositoryName: 'tmp-fixture',
      owner: 'test'
    });

    const file = await prisma.file.findUnique({
      where: { repositoryId_path: { repositoryId: repoId, path: fileRelPath } }
    });
    expect(file).toBeTruthy();
    if (!file) return;

    const symbolCount = await prisma.symbol.count({ where: { fileId: file.id } });
    expect(symbolCount).toBeGreaterThan(0);

    const importCount = await prisma.fileImport.count({ where: { fileId: file.id } });
    expect(importCount).toBeGreaterThan(0);
  });
});

