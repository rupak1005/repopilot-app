import path from 'node:path';

export function normalizeRepoPath(filePath: string): string {
  return path.posix.normalize(filePath);
}

function pickKnown(candidates: Iterable<string>, knownFiles: Set<string>): string | null {
  for (const candidate of candidates) {
    if (knownFiles.has(candidate)) return candidate;
  }
  return null;
}

function jsCandidates(resolvedBase: string): string[] {
  return [
    resolvedBase,
    `${resolvedBase}.ts`,
    `${resolvedBase}.tsx`,
    `${resolvedBase}.js`,
    `${resolvedBase}.jsx`,
    `${resolvedBase}.mts`,
    `${resolvedBase}.mjs`,
    normalizeRepoPath(path.posix.join(resolvedBase, 'index.ts')),
    normalizeRepoPath(path.posix.join(resolvedBase, 'index.tsx')),
    normalizeRepoPath(path.posix.join(resolvedBase, 'index.js')),
    normalizeRepoPath(path.posix.join(resolvedBase, 'index.jsx'))
  ];
}

function pythonCandidates(resolvedBase: string): string[] {
  return [
    resolvedBase,
    `${resolvedBase}.py`,
    normalizeRepoPath(path.posix.join(resolvedBase, '__init__.py'))
  ];
}

/** Map `from .db import x` / `from fastapi.routing import y` onto repo files. */
export function resolvePythonModule(
  fromFilePath: string,
  moduleSpecifier: string,
  knownFiles: Set<string>
): string | null {
  const fromDir = path.posix.dirname(fromFilePath);

  if (moduleSpecifier.startsWith('.')) {
    let dots = 0;
    while (moduleSpecifier[dots] === '.') dots += 1;
    let dir = fromDir;
    for (let i = 1; i < dots; i += 1) {
      dir = path.posix.dirname(dir);
    }
    const rest = moduleSpecifier.slice(dots).replace(/\./g, '/');
    const base = rest ? normalizeRepoPath(path.posix.join(dir, rest)) : dir;
    return pickKnown(pythonCandidates(base), knownFiles);
  }

  const asPath = moduleSpecifier.replace(/\./g, '/');
  const hit = pickKnown(pythonCandidates(asPath), knownFiles);
  if (hit) return hit;

  // Intra-package: routing.py importing fastapi.routing while living under fastapi/
  const prefixed = normalizeRepoPath(path.posix.join(fromDir.split('/')[0] ?? '', asPath));
  return pickKnown(pythonCandidates(prefixed), knownFiles);
}

/** Map `import "github.com/org/repo/internal/auth"` onto `internal/auth/*.go`. */
export function resolveGoModule(
  fromFilePath: string,
  moduleSpecifier: string,
  knownFiles: Set<string>
): string | null {
  const spec = moduleSpecifier.replace(/^["']|["']$/g, '');
  if (!spec) return null;

  if (spec.startsWith('.')) {
    const baseDir = path.posix.dirname(fromFilePath);
    const resolved = normalizeRepoPath(path.posix.join(baseDir, spec));
    for (const file of knownFiles) {
      if (file.endsWith('.go') && path.posix.dirname(file) === resolved) return file;
    }
    return null;
  }

  const segments = spec.split('/');
  for (let i = 0; i < segments.length; i += 1) {
    const suffix = segments.slice(i).join('/');
    for (const file of knownFiles) {
      if (!file.endsWith('.go')) continue;
      const dir = path.posix.dirname(file);
      if (dir === suffix || dir.endsWith(`/${suffix}`)) return file;
    }
  }

  return null;
}

export function resolveJsModule(
  fromFilePath: string,
  moduleSpecifier: string,
  knownFiles: Set<string>
): string | null {
  if (!moduleSpecifier.startsWith('.')) return null;
  const baseDir = path.posix.dirname(fromFilePath);
  const resolvedBase = normalizeRepoPath(path.posix.join(baseDir, moduleSpecifier));
  return pickKnown(jsCandidates(resolvedBase), knownFiles);
}

export function resolveModuleSpecifier(
  fromFilePath: string,
  moduleSpecifier: string,
  knownFiles: Set<string>
): string | null {
  const ext = path.extname(fromFilePath).toLowerCase();
  if (ext === '.py') return resolvePythonModule(fromFilePath, moduleSpecifier, knownFiles);
  if (ext === '.go') return resolveGoModule(fromFilePath, moduleSpecifier, knownFiles);
  return resolveJsModule(fromFilePath, moduleSpecifier, knownFiles);
}
