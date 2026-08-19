import fg from 'fast-glob';
import path from 'node:path';

export type DiscoveredFile = {
  /** Path relative to the repo root, using forward slashes. */
  path: string;
  /** Absolute path on disk. */
  absPath: string;
};

/**
 * Discover source files for Phase 2 parsing.
 *
 * Roadmap rules:
 * - Include: TS/JS (ts, tsx, js, jsx)
 * - Exclude: node_modules, .git, and build artifacts
 */
export async function discoverSourceFiles(
  repoPath: string
): Promise<DiscoveredFile[]> {
  const absRepoRoot = path.resolve(repoPath);

  const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
  const ignore = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/coverage/**'
  ];

  const absPaths = await fg(patterns, {
    cwd: absRepoRoot,
    ignore,
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

