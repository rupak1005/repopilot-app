import path from 'node:path';
import fs from 'node:fs/promises';
import { discoverSourceFiles } from '../repo/fileDiscovery';
import { parseCodeToRecords } from '../repo/treeSitterParser';
import { ensureRepository, upsertFileAndReplaceParsedData } from '../repo/persistence';

export type SyncRepositoryArgs = {
  repositoryId: string;
  repoPath: string;
  repositoryName?: string;
  owner?: string;
  concurrency?: number;
};

export type SyncRepositoryResult = {
  repositoryId: string;
  filesScanned: number;
  filesParsed: number;
  symbolsExtracted: number;
  importsExtracted: number;
  exportsExtracted: number;
};

function logEvent(event: string, fields: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      event,
      ...fields
    })
  );
}

export async function syncRepository(
  args: SyncRepositoryArgs
): Promise<SyncRepositoryResult> {
  const files = await discoverSourceFiles(args.repoPath);

  const repositoryName =
    args.repositoryName ?? path.basename(path.resolve(args.repoPath));
  const owner = args.owner ?? 'unknown';

  await ensureRepository({
    repositoryId: args.repositoryId,
    name: repositoryName,
    owner
  });

  logEvent('repo.sync.started', {
    repositoryId: args.repositoryId,
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
        await upsertFileAndReplaceParsedData({
          repositoryId: args.repositoryId,
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
          filePath: file.path,
          symbols: parsed.symbols.length,
          imports: parsed.imports.length,
          exports: parsed.exports.length
        });
      } catch (err) {
        logEvent('repo.sync.fileParseFailed', {
          repositoryId: args.repositoryId,
          filePath: file.path,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }

  await Promise.all(workers);

  logEvent('repo.sync.completed', {
    repositoryId: args.repositoryId,
    filesScanned,
    filesParsed,
    symbolsExtracted,
    importsExtracted,
    exportsExtracted
  });

  return {
    repositoryId: args.repositoryId,
    filesScanned,
    filesParsed,
    symbolsExtracted,
    importsExtracted,
    exportsExtracted
  };
}

