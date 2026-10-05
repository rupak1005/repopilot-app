import { getPrisma } from '../db/prisma';
import { resolveRepositoryRevision } from './repositoryRevisions';

const DEFAULT_MAX_FILE_BYTES = 200_000;
const DEFAULT_MAX_TOTAL_BYTES = 5_000_000;

export type RepositoryDigest = {
  repository: { owner: string; name: string };
  revisionSha: string;
  indexedAt: string;
  stats: {
    filesAnalyzed: number;
    directories: number;
    sourceFiles: number;
    extractedBytes: number;
    estimatedTokens: number;
  };
  tree: string;
  files: Array<{ path: string; bytes: number; lines: number; truncated: boolean }>;
  markdown: string;
};

function isSourceFile(path: string): boolean {
  return /\.(c|cc|cpp|css|go|h|html|java|js|jsx|md|mdx|py|rs|sql|swift|ts|tsx|vue|yaml|yml|json)$/i.test(path);
}

function directoryCount(paths: string[]): number {
  const dirs = new Set<string>();
  for (const path of paths) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }
  return dirs.size;
}

function buildTree(paths: string[]): string {
  const sorted = [...paths].sort();
  const lines: string[] = [];
  for (const path of sorted) {
    const parts = path.split('/');
    const depth = parts.length - 1;
    lines.push(`${'  '.repeat(depth)}${parts[parts.length - 1]}`);
  }
  return lines.join('\n');
}

function buildMarkdown(args: {
  repository: { owner: string; name: string };
  revisionSha: string;
  stats: RepositoryDigest['stats'];
  tree: string;
  contents: Array<{ path: string; content: string; truncated: boolean }>;
}): string {
  const source = args.contents
    .map(
      (file) =>
        `### ${file.path}${file.truncated ? ' (truncated)' : ''}\n\n` +
        '```text\n' +
        file.content.replace(/```/g, '` ` `') +
        '\n```'
    )
    .join('\n\n');
  return [
    `# Repository: ${args.repository.owner}/${args.repository.name}`,
    '',
    `Revision: ${args.revisionSha}`,
    '',
    '## Summary',
    '',
    `Files analyzed: ${args.stats.filesAnalyzed}`,
    `Directories: ${args.stats.directories}`,
    `Source files: ${args.stats.sourceFiles}`,
    `Estimated tokens: ${args.stats.estimatedTokens}`,
    '',
    '## Directory structure',
    '',
    '```text',
    args.tree,
    '```',
    '',
    '## Extracted source',
    '',
    source
  ].join('\n');
}

export async function buildRepositoryDigest(args: {
  repositoryId: string;
  revisionSha?: string;
  maxFileBytes?: number;
  maxTotalBytes?: number;
}): Promise<RepositoryDigest | null> {
  const revision = await resolveRepositoryRevision(args);
  if (!revision) return null;
  const prisma = getPrisma();
  const repository = await prisma.repository.findUnique({
    where: { id: args.repositoryId },
    select: { owner: true, name: true }
  });
  if (!repository) return null;

  const maxFileBytes = Math.min(Math.max(args.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES, 1_000), 1_000_000);
  const maxTotalBytes = Math.min(Math.max(args.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES, maxFileBytes), 20_000_000);
  const rows = await prisma.file.findMany({
    where: { revisionId: revision.id },
    select: { path: true, content: true },
    orderBy: { path: 'asc' },
    take: 10_000
  });

  let totalBytes = 0;
  const contents: Array<{ path: string; content: string; truncated: boolean }> = [];
  for (const row of rows) {
    if (totalBytes >= maxTotalBytes) break;
    const available = Math.min(row.content.length, maxFileBytes, maxTotalBytes - totalBytes);
    const content = row.content.slice(0, available);
    totalBytes += content.length;
    contents.push({ path: row.path, content, truncated: content.length < row.content.length });
  }
  const paths = contents.map((row) => row.path);
  const stats = {
    filesAnalyzed: contents.length,
    directories: directoryCount(paths),
    sourceFiles: paths.filter(isSourceFile).length,
    extractedBytes: totalBytes,
    estimatedTokens: Math.ceil(totalBytes / 4)
  };
  const tree = buildTree(paths);
  return {
    repository,
    revisionSha: revision.revisionSha,
    indexedAt: revision.indexedAt.toISOString(),
    stats,
    tree,
    files: contents.map((file) => ({
      path: file.path,
      bytes: file.content.length,
      lines: file.content ? file.content.split(/\r?\n/).length : 0,
      truncated: file.truncated
    })),
    markdown: buildMarkdown({ repository, revisionSha: revision.revisionSha, stats, tree, contents })
  };
}
