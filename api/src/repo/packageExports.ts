import path from 'node:path';

function normalizeRepoPath(filePath: string): string {
  return path.posix.normalize(filePath);
}

export type PackageExportEntry = {
  /** Package name from package.json (`@scope/pkg` or `pkg`). */
  name: string;
  /** Directory containing package.json (repo-relative). */
  packageDir: string;
  /**
   * Subpath → target bases relative to packageDir.
   * `"."` is the package root entry. Targets are export paths without conditions expanded.
   */
  subpaths: Map<string, string[]>;
};

function jsFileCandidates(resolvedBase: string): string[] {
  return [
    resolvedBase,
    `${resolvedBase}.ts`,
    `${resolvedBase}.tsx`,
    `${resolvedBase}.js`,
    `${resolvedBase}.jsx`,
    `${resolvedBase}.mts`,
    `${resolvedBase}.mjs`,
    `${resolvedBase}.cts`,
    `${resolvedBase}.cjs`,
    normalizeRepoPath(path.posix.join(resolvedBase, 'index.ts')),
    normalizeRepoPath(path.posix.join(resolvedBase, 'index.tsx')),
    normalizeRepoPath(path.posix.join(resolvedBase, 'index.js')),
    normalizeRepoPath(path.posix.join(resolvedBase, 'index.jsx'))
  ];
}

function pickKnown(candidates: Iterable<string>, knownFiles: Set<string>): string | null {
  for (const candidate of candidates) {
    if (knownFiles.has(candidate)) return candidate;
  }
  return null;
}

/** Flatten conditional export values to string targets (import/default/require/types). */
export function flattenExportTarget(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenExportTarget(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['import', 'module', 'default', 'require', 'types', 'node', 'browser']) {
      if (key in record) flattenExportTarget(record[key], out);
    }
    // Fall back to any string-valued nested leaves.
    for (const nested of Object.values(record)) {
      if (typeof nested === 'string' || Array.isArray(nested) || (nested && typeof nested === 'object')) {
        flattenExportTarget(nested, out);
      }
    }
  }
  return out;
}

function normalizeExportKey(key: string): string {
  if (key === '.' || key === './') return '.';
  return key.startsWith('./') ? key : `./${key}`;
}

function targetsFromMainFields(pkg: {
  main?: unknown;
  module?: unknown;
  types?: unknown;
  typings?: unknown;
}): string[] {
  const out: string[] = [];
  for (const field of [pkg.module, pkg.main, pkg.types, pkg.typings]) {
    if (typeof field === 'string' && field.trim()) out.push(field.trim());
  }
  return out;
}

/**
 * Parse one package.json into an export map for in-repo package resolution.
 * Ignores external packages that aren't present as indexed files.
 */
export function parsePackageExports(
  content: string,
  packageJsonPath: string
): PackageExportEntry | null {
  let parsed: {
    name?: unknown;
    exports?: unknown;
    main?: unknown;
    module?: unknown;
    types?: unknown;
    typings?: unknown;
  };
  try {
    parsed = JSON.parse(content) as typeof parsed;
  } catch {
    return null;
  }

  if (typeof parsed.name !== 'string' || !parsed.name.trim()) return null;

  const packageDir = normalizeRepoPath(path.posix.dirname(packageJsonPath));
  const subpaths = new Map<string, string[]>();

  if (typeof parsed.exports === 'string') {
    subpaths.set('.', flattenExportTarget(parsed.exports));
  } else if (parsed.exports && typeof parsed.exports === 'object' && !Array.isArray(parsed.exports)) {
    for (const [rawKey, rawValue] of Object.entries(parsed.exports as Record<string, unknown>)) {
      const key = normalizeExportKey(rawKey);
      const targets = flattenExportTarget(rawValue).filter((t) => typeof t === 'string' && t.length > 0);
      if (targets.length === 0) continue;
      subpaths.set(key, targets);
    }
  }

  if (!subpaths.has('.')) {
    const mains = targetsFromMainFields(parsed);
    if (mains.length > 0) subpaths.set('.', mains);
    else subpaths.set('.', ['.']);
  }

  return { name: parsed.name.trim(), packageDir, subpaths };
}

export function collectPackageExportsFromFiles(
  files: Array<{ path: string; content: string }>
): PackageExportEntry[] {
  const byName = new Map<string, PackageExportEntry>();
  for (const file of files) {
    if (path.posix.basename(file.path) !== 'package.json') continue;
    const entry = parsePackageExports(file.content, file.path);
    if (!entry) continue;
    // First wins; monorepos usually unique names.
    if (!byName.has(entry.name)) byName.set(entry.name, entry);
  }
  return [...byName.values()].sort((a, b) => b.name.length - a.name.length);
}

function matchPackage(
  moduleSpecifier: string,
  entries: PackageExportEntry[]
): { entry: PackageExportEntry; subpathKey: string; wildcardRest: string } | null {
  for (const entry of entries) {
    if (moduleSpecifier === entry.name) {
      return { entry, subpathKey: '.', wildcardRest: '' };
    }
    const prefix = `${entry.name}/`;
    if (!moduleSpecifier.startsWith(prefix)) continue;
    const rest = moduleSpecifier.slice(prefix.length);
    const exactKey = normalizeExportKey(rest);
    if (entry.subpaths.has(exactKey)) {
      return { entry, subpathKey: exactKey, wildcardRest: '' };
    }

    for (const key of entry.subpaths.keys()) {
      if (!key.endsWith('/*')) continue;
      // `./features/*` → prefix inside package `features/`
      const inside = key.slice(2, -1); // strip ./ and *
      if (inside && rest.startsWith(inside)) {
        return { entry, subpathKey: key, wildcardRest: rest.slice(inside.length) };
      }
      if (inside === '' || inside === '/') {
        return { entry, subpathKey: key, wildcardRest: rest };
      }
    }

    // No matching export key — still try the path under the package root.
    return { entry, subpathKey: exactKey, wildcardRest: '' };
  }
  return null;
}

function expandExportTargets(
  entry: PackageExportEntry,
  subpathKey: string,
  wildcardRest: string
): string[] {
  const rawTargets = entry.subpaths.get(subpathKey);
  if (!rawTargets) {
    // Fallback: treat subpath as a file path under the package.
    if (subpathKey === '.') return [entry.packageDir];
    const rel = subpathKey.startsWith('./') ? subpathKey.slice(2) : subpathKey;
    return [normalizeRepoPath(path.posix.join(entry.packageDir, rel))];
  }

  const bases: string[] = [];
  for (const target of rawTargets) {
    let mapped = target;
    if (subpathKey.endsWith('/*') && mapped.includes('*')) {
      mapped = mapped.replace('*', wildcardRest);
    }
    if (mapped === '.' || mapped === './') {
      bases.push(entry.packageDir);
      continue;
    }
    const rel = mapped.startsWith('./') ? mapped.slice(2) : mapped.replace(/^\//, '');
    bases.push(normalizeRepoPath(path.posix.join(entry.packageDir, rel)));
  }
  return bases;
}

/**
 * Resolve a bare/package specifier against indexed in-repo package.json exports.
 * External npm packages (not in the index) return null.
 */
export function resolvePackageExportSpecifier(
  moduleSpecifier: string,
  knownFiles: Set<string>,
  packages: PackageExportEntry[]
): string | null {
  if (!moduleSpecifier || moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/')) {
    return null;
  }
  // Keep `@/` for the path-alias / heuristic path — not a package name.
  if (moduleSpecifier.startsWith('@/')) return null;

  const matched = matchPackage(moduleSpecifier, packages);
  if (!matched) return null;

  const bases = expandExportTargets(matched.entry, matched.subpathKey, matched.wildcardRest);
  for (const base of bases) {
    const hit = pickKnown(jsFileCandidates(base), knownFiles);
    if (hit) return hit;
  }
  return null;
}
