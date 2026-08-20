import path from 'node:path';

function normalizeRepoPath(filePath: string): string {
  return path.posix.normalize(filePath);
}

export type PathAliasRule = {
  /** Import prefix to match (e.g. `@/` or `@lib/`). Longer prefixes win. */
  prefix: string;
  /** Mapped repo-relative directories / file bases (no trailing slash required). */
  targets: string[];
};

function stripJsonc(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1');
}

function isConfigPath(filePath: string): boolean {
  const base = path.posix.basename(filePath);
  return /^(ts|js)config(\..+)?\.json$/.test(base);
}

/** Parse `compilerOptions.paths` relative to the config file’s directory. */
export function parseTsconfigPathAliases(
  content: string,
  configPath: string
): PathAliasRule[] {
  let parsed: {
    compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
  };
  try {
    parsed = JSON.parse(stripJsonc(content)) as typeof parsed;
  } catch {
    return [];
  }

  const paths = parsed.compilerOptions?.paths;
  if (!paths || typeof paths !== 'object') return [];

  const configDir = path.posix.dirname(configPath);
  const baseUrlRaw = parsed.compilerOptions?.baseUrl?.trim() || '.';
  const baseUrl = normalizeRepoPath(path.posix.join(configDir, baseUrlRaw));

  const rules: PathAliasRule[] = [];
  for (const [pattern, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets) || targets.length === 0) continue;
    const wildcard = pattern.endsWith('/*');
    const prefix = wildcard ? pattern.slice(0, -1) : pattern; // keep trailing `/` for `@/*` → `@/`
    const mapped = targets
      .map((target) => {
        const cleaned = wildcard && target.endsWith('/*') ? target.slice(0, -2) : target;
        return normalizeRepoPath(path.posix.join(baseUrl, cleaned));
      })
      .filter(Boolean);
    if (mapped.length === 0) continue;
    rules.push({ prefix, targets: mapped });
  }

  // Longest prefix first so `@lib/` beats `@`.
  rules.sort((a, b) => b.prefix.length - a.prefix.length);
  return rules;
}

/** Collect path-alias rules from every indexed tsconfig / jsconfig. */
export function collectPathAliasesFromFiles(
  files: Array<{ path: string; content: string }>
): PathAliasRule[] {
  const byPrefix = new Map<string, PathAliasRule>();
  for (const file of files) {
    if (!isConfigPath(file.path)) continue;
    for (const rule of parseTsconfigPathAliases(file.content, file.path)) {
      const existing = byPrefix.get(rule.prefix);
      if (!existing) {
        byPrefix.set(rule.prefix, { ...rule, targets: [...rule.targets] });
        continue;
      }
      for (const target of rule.targets) {
        if (!existing.targets.includes(target)) existing.targets.push(target);
      }
    }
  }
  return [...byPrefix.values()].sort((a, b) => b.prefix.length - a.prefix.length);
}

/** Expand a non-relative specifier through tsconfig path aliases into candidate bases. */
export function aliasCandidateBases(
  moduleSpecifier: string,
  aliases: PathAliasRule[]
): string[] {
  if (!moduleSpecifier || moduleSpecifier.startsWith('.')) return [];
  const out: string[] = [];
  for (const rule of aliases) {
    if (moduleSpecifier === rule.prefix.replace(/\/$/, '') || moduleSpecifier === rule.prefix) {
      for (const target of rule.targets) out.push(target);
      continue;
    }
    if (!moduleSpecifier.startsWith(rule.prefix)) continue;
    const rest = moduleSpecifier.slice(rule.prefix.length);
    for (const target of rule.targets) {
      out.push(rest ? normalizeRepoPath(path.posix.join(target, rest)) : target);
    }
    // First matching (longest) prefix wins.
    break;
  }
  return out;
}
