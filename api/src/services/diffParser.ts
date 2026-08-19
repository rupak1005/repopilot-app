export type DiffLineType = 'added' | 'removed' | 'context';

export type DiffLine = {
  type: DiffLineType;
  content: string;
  oldLine?: number;
  newLine?: number;
};

export type DiffHunk = {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
};

export type FileChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export type FileChange = {
  path: string;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
};

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function parseUnifiedDiff(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const rawLine of patch.split('\n')) {
    const headerMatch = rawLine.match(HUNK_HEADER);
    if (headerMatch) {
      if (current) hunks.push(current);
      current = {
        oldStart: Number(headerMatch[1]),
        oldLines: Number(headerMatch[2] ?? '1'),
        newStart: Number(headerMatch[3]),
        newLines: Number(headerMatch[4] ?? '1'),
        lines: []
      };
      oldLine = current.oldStart;
      newLine = current.newStart;
      continue;
    }

    if (!current) continue;

    if (rawLine.startsWith('+')) {
      current.lines.push({
        type: 'added',
        content: rawLine.slice(1),
        newLine
      });
      newLine += 1;
      continue;
    }

    if (rawLine.startsWith('-')) {
      current.lines.push({
        type: 'removed',
        content: rawLine.slice(1),
        oldLine
      });
      oldLine += 1;
      continue;
    }

    if (rawLine.startsWith(' ') || rawLine === '') {
      current.lines.push({
        type: 'context',
        content: rawLine.startsWith(' ') ? rawLine.slice(1) : rawLine,
        oldLine,
        newLine
      });
      oldLine += 1;
      newLine += 1;
    }
  }

  if (current) hunks.push(current);
  return hunks;
}

export function buildFileChange(args: {
  path: string;
  status: FileChangeStatus;
  patch?: string | null;
}): FileChange {
  const hunks = args.patch ? parseUnifiedDiff(args.patch) : [];
  let additions = 0;
  let deletions = 0;

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'added') additions += 1;
      if (line.type === 'removed') deletions += 1;
    }
  }

  return {
    path: args.path,
    status: args.status,
    additions,
    deletions,
    hunks
  };
}

export function isBinaryOrIgnoredPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.ico') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.zip') ||
    lower.endsWith('.woff') ||
    lower.endsWith('.woff2') ||
    lower.endsWith('.ttf') ||
    lower.endsWith('.eot')
  );
}
