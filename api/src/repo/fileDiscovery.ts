import fg from 'fast-glob';
import path from 'node:path';

export type DiscoveredFile = {
  /** Path relative to the repo root, using forward slashes. */
  path: string;
  /** Absolute path on disk. */
  absPath: string;
};

export const SOURCE_FILE_PATTERNS = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
  '**/*.mts',
  '**/*.mjs',
  '**/*.py',
  '**/*.go'
];

const IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/coverage/**',
  '**/venv/**',
  '**/.venv/**',
  '**/__pycache__/**',
  '**/.mypy_cache/**',
  '**/.tox/**',
  '**/site-packages/**',
  '**/vendor/**'
];

export async function discoverSourceFiles(repoPath: string): Promise<DiscoveredFile[]> {
  const absRepoRoot = path.resolve(repoPath);

  const absPaths = await fg(SOURCE_FILE_PATTERNS, {
    cwd: absRepoRoot,
    ignore: IGNORE,
    absolute: true,
    onlyFiles: true
  });

  return absPaths.map((absPath) => {
    const rel = path.relative(absRepoRoot, absPath);
    return {
      absPath,
      path: rel.split(path.sep).join('/')
    };
  });
}
