export type CodeOwnerRule = {
  pattern: string;
  owners: string[];
  line: number;
};

const OWNER_RE = /^(@[A-Za-z0-9_.\-]+(?:\/[A-Za-z0-9_.\-]+)?|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export function parseCodeOwners(content: string): CodeOwnerRule[] {
  const rules: CodeOwnerRule[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;
    const pattern = parts[0]!;
    const owners = parts.slice(1).filter((token) => OWNER_RE.test(token));
    if (owners.length === 0) continue;
    rules.push({ pattern, owners, line: i + 1 });
  }
  return rules;
}

function escapeRegex(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

export function codeOwnerPatternToRegExp(pattern: string): RegExp {
  let source = pattern.replace(/\\/g, '/');
  const anchored = source.startsWith('/');
  if (anchored) source = source.slice(1);

  // Trailing slash → directory prefix.
  const dirOnly = source.endsWith('/');
  if (dirOnly) source = source.slice(0, -1);

  let body = '';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]!;
    if (ch === '*' && source[i + 1] === '*') {
      body += '.*';
      i += 1;
      continue;
    }
    if (ch === '*') {
      body += '[^/]*';
      continue;
    }
    if (ch === '?') {
      body += '[^/]';
      continue;
    }
    body += escapeRegex(ch);
  }

  if (dirOnly) {
    body = `${body}(?:/.*)?`;
  }

  const prefix = anchored ? '^' : '(?:^|/)';
  return new RegExp(`${prefix}${body}$`);
}

export function ruleMatchesPath(pattern: string, filePath: string): boolean {
  const path = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  try {
    return codeOwnerPatternToRegExp(pattern).test(path);
  } catch {
    return false;
  }
}

export function ownersForPath(rules: CodeOwnerRule[], filePath: string): string[] {
  let owners: string[] = [];
  for (const rule of rules) {
    if (ruleMatchesPath(rule.pattern, filePath)) {
      owners = [...rule.owners];
    }
  }
  return owners;
}

export const CODEOWNERS_CANDIDATE_PATHS = [
  'CODEOWNERS',
  '.github/CODEOWNERS',
  'docs/CODEOWNERS'
] as const;
