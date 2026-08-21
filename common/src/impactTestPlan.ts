/**
 * Classify impacted test paths into copyable local run commands.
 * Does not execute tests — Gate B entry point for human / agent handoff.
 */

export type ImpactTestClass = {
  filePath: string;
  /** Yarn/npm workspace package name when known. */
  packageName: string | null;
  /** Path passed to the package test script (relative to that package). */
  fileArg: string;
  runner: 'vitest-workspace' | 'vitest-root';
};

export type ImpactTestCommand = {
  packageName: string | null;
  files: string[];
  command: string;
};

export type ImpactTestPlan = {
  classes: ImpactTestClass[];
  commands: ImpactTestCommand[];
  /** Newline-joined commands for clipboard / shell paste. */
  shellScript: string;
};

const KNOWN_WORKSPACES: Array<{ prefix: string; packageName: string }> = [
  { prefix: 'api/', packageName: '@repopilot/api' },
  { prefix: 'web/', packageName: '@repopilot/web' },
  { prefix: 'common/', packageName: '@repopilot/common' }
];

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Map a repo-relative test path to a workspace + file arg. */
export function classifyImpactTestPath(filePath: string): ImpactTestClass {
  const path = normalizePath(filePath);

  for (const hint of KNOWN_WORKSPACES) {
    if (path.startsWith(hint.prefix)) {
      return {
        filePath: path,
        packageName: hint.packageName,
        fileArg: path.slice(hint.prefix.length),
        runner: 'vitest-workspace'
      };
    }
  }

  const packagesMatch = path.match(/^packages\/([^/]+)\/(.+)$/);
  if (packagesMatch) {
    return {
      filePath: path,
      packageName: packagesMatch[1]!,
      fileArg: packagesMatch[2]!,
      runner: 'vitest-workspace'
    };
  }

  const appsMatch = path.match(/^apps\/([^/]+)\/(.+)$/);
  if (appsMatch) {
    return {
      filePath: path,
      packageName: appsMatch[1]!,
      fileArg: appsMatch[2]!,
      runner: 'vitest-workspace'
    };
  }

  return {
    filePath: path,
    packageName: null,
    fileArg: path,
    runner: 'vitest-root'
  };
}

function commandForGroup(packageName: string | null, fileArgs: string[]): string {
  if (packageName) {
    return `yarn workspace ${packageName} test ${fileArgs.join(' ')}`;
  }
  return `npx vitest run ${fileArgs.join(' ')}`;
}

/** Build grouped copyable commands from recommended test file paths. */
export function buildImpactTestPlan(filePaths: string[]): ImpactTestPlan {
  const classes = filePaths.map(classifyImpactTestPath);
  const groups = new Map<string, ImpactTestClass[]>();

  for (const row of classes) {
    const key = row.packageName ?? '__root__';
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const commands: ImpactTestCommand[] = [];
  for (const [key, rows] of groups) {
    const packageName = key === '__root__' ? null : key;
    const fileArgs = rows.map((r) => r.fileArg);
    commands.push({
      packageName,
      files: rows.map((r) => r.filePath),
      command: commandForGroup(packageName, fileArgs)
    });
  }

  commands.sort((a, b) => (a.packageName ?? '').localeCompare(b.packageName ?? ''));

  return {
    classes,
    commands,
    shellScript: commands.map((c) => c.command).join('\n')
  };
}
