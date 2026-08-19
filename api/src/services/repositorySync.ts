import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { discoverSourceFiles } from '../repo/fileDiscovery';
import { parseCodeToRecords } from '../repo/treeSitterParser';
import {
  clearRevisionData,
  ensureRepository,
  ensureRepositoryRevision,
  insertFileParsedData
} from '../repo/persistence';
import { indexRepositorySearch } from './searchIndex';

const execFileAsync = promisify(execFile);

export type SyncRepositoryArgs = {
  repositoryId: string;
  repoPath: string;
  revisionSha?: string;
  repositoryName?: string;
  owner?: string;
  concurrency?: number;
};

export type SyncRepositoryResult = {
  repositoryId: string;
  revisionId: string;
  revisionSha: string;
  filesScanned: number;
  filesParsed: number;
  symbolsExtracted: number;
  importsExtracted: number;
  exportsExtracted: number;
  chunksIndexed: number;
};

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      event,
      ...fields
    })
  );
}

async function resolveRevisionSha(args: {
  repoPath: string;
  revisionSha?: string;
}): Promise<string> {
  if (args.revisionSha) return args.revisionSha;

  try {
    const result = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: args.repoPath
    });
    const sha = result.stdout.trim();
    if (sha) return sha;
  } catch {
    // Fall through to a stable manual label when syncing non-git fixtures.
  }

  return `manual-${Date.now()}`;
}

export async function syncRepository(
  args: SyncRepositoryArgs
): Promise<SyncRepositoryResult> {
  const files = await discoverSourceFiles(args.repoPath);
  const revisionSha = await resolveRevisionSha({
    repoPath: args.repoPath,
    revisionSha: args.revisionSha
  });

  const repositoryName =
    args.repositoryName ?? path.basename(path.resolve(args.repoPath));
  const owner = args.owner ?? 'unknown';

  await ensureRepository({
    repositoryId: args.repositoryId,
    name: repositoryName,
    owner
  });
  const revision = await ensureRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha
  });
  await clearRevisionData({ revisionId: revision.id });

  logEvent('repo.sync.started', {
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    revisionSha,
    repoPath: args.repoPath,
    filesDiscovered: files.length,
    concurrency: args.concurrency ?? 8
  });

  const concurrency = Math.max(1, args.concurrency ?? 8);

  let idx = 0;
  let filesScanned = files.length;

  let filesParsed = 0;
  let symbolsExtracted = 0;
  let importsExtracted = 0;
  let exportsExtracted = 0;

  const workerCount = Math.min(concurrency, files.length);
  const workers = Array.from({ length: workerCount }, () => worker());

  async function worker() {
    while (true) {
      const current = idx++;
      if (current >= files.length) return;

      const file = files[current];
      try {
        const code = await fs.readFile(file.absPath, 'utf8');
        const parsed = parseCodeToRecords(file.path, code);
        await insertFileParsedData({
          repositoryId: args.repositoryId,
          revisionId: revision.id,
          path: file.path,
          content: code,
          parsed
        });

        filesParsed++;
        symbolsExtracted += parsed.symbols.length;
        importsExtracted += parsed.imports.length;
        exportsExtracted += parsed.exports.length;

        logEvent('repo.sync.fileParsed', {
          repositoryId: args.repositoryId,
          revisionId: revision.id,
          revisionSha,
          filePath: file.path,
          symbols: parsed.symbols.length,
          imports: parsed.imports.length,
          exports: parsed.exports.length
        });
      } catch (err) {
        logEvent('repo.sync.fileParseFailed', {
          repositoryId: args.repositoryId,
          revisionId: revision.id,
          revisionSha,
          filePath: file.path,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }

  await Promise.all(workers);

  logEvent('repo.sync.completed', {
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    revisionSha,
    filesScanned,
    filesParsed,
    symbolsExtracted,
    importsExtracted,
    exportsExtracted
  });

  const searchIndex = await indexRepositorySearch({
    repositoryId: args.repositoryId,
    revisionSha
  });

  return {
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    revisionSha,
    filesScanned,
    filesParsed,
    symbolsExtracted,
    importsExtracted,
    exportsExtracted,
    chunksIndexed: searchIndex.chunksIndexed
  };
}

