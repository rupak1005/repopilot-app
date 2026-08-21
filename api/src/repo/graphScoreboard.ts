import { resolveJsModule, resolveModuleSpecifier } from './moduleResolve';
import {
  collectPackageExportsFromFiles,
  type PackageExportEntry
} from './packageExports';
import { resolveImportedSymbolId, type ResolveSymbolFile } from './symbolResolve';
import {
  collectPathAliasesFromFiles,
  type PathAliasRule
} from './tsconfigPaths';

export type ResolveLabel = {
  id: string;
  fromFile: string;
  specifier: string;
  /** Paths that exist in the fixture index. */
  knownFiles: string[];
  /** Optional inline tsconfig/package.json contents keyed by path. */
  configFiles?: Record<string, string>;
  /** Expected resolved path, or null when the specifier must stay unresolved. */
  expected: string | null;
};

export type SymbolResolveLabel = {
  id: string;
  files: Record<string, ResolveSymbolFile>;
  targetPath: string;
  binding: {
    module: string;
    kind: 'named' | 'default' | 'namespace';
    importedName: string;
  };
  propertyName?: string;
  expectedSymbolId: string | null;
};

export type ScoreMetrics = {
  predicted: number;
  expectedPositive: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  precision: number;
  recall: number;
  unresolvedAccuracy: number;
};

function ratio(num: number, den: number): number {
  if (den <= 0) return 1;
  return num / den;
}

export function scoreMetrics(args: {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
}): ScoreMetrics {
  const predicted = args.truePositive + args.falsePositive;
  const expectedPositive = args.truePositive + args.falseNegative;
  return {
    predicted,
    expectedPositive,
    truePositive: args.truePositive,
    falsePositive: args.falsePositive,
    falseNegative: args.falseNegative,
    trueNegative: args.trueNegative,
    precision: ratio(args.truePositive, predicted),
    recall: ratio(args.truePositive, expectedPositive),
    unresolvedAccuracy: ratio(args.trueNegative, args.trueNegative + args.falsePositive)
  };
}

function configsForCase(label: ResolveLabel): {
  pathAliases: PathAliasRule[];
  packageExports: PackageExportEntry[];
} {
  const configs = Object.entries(label.configFiles ?? {}).map(([path, content]) => ({
    path,
    content
  }));
  return {
    pathAliases: collectPathAliasesFromFiles(configs),
    packageExports: collectPackageExportsFromFiles(configs)
  };
}

/** Score module-specifier resolution against labeled fixtures. */
export function scoreModuleResolves(labels: ResolveLabel[]): ScoreMetrics {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let trueNegative = 0;

  for (const label of labels) {
    const known = new Set(label.knownFiles);
    const { pathAliases, packageExports } = configsForCase(label);
    const got = resolveModuleSpecifier(
      label.fromFile,
      label.specifier,
      known,
      pathAliases,
      packageExports
    );

    if (label.expected == null) {
      if (got == null) trueNegative += 1;
      else falsePositive += 1;
      continue;
    }

    if (got === label.expected) truePositive += 1;
    else if (got == null) falseNegative += 1;
    else falsePositive += 1; // wrong file counts as FP for this scoreboard
  }

  return scoreMetrics({ truePositive, falsePositive, falseNegative, trueNegative });
}

/** Score imported-symbol resolve (barrels / re-exports) against labeled fixtures. */
export function scoreSymbolResolves(labels: SymbolResolveLabel[]): ScoreMetrics {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let trueNegative = 0;

  for (const label of labels) {
    const filesByPath = new Map(Object.entries(label.files));
    const knownFiles = new Set(filesByPath.keys());
    const targetFile = filesByPath.get(label.targetPath);
    if (!targetFile) {
      falseNegative += 1;
      continue;
    }

    const got = resolveImportedSymbolId({
      targetFile,
      binding: label.binding,
      propertyName: label.propertyName,
      filesByPath,
      knownFiles
    });

    if (label.expectedSymbolId == null) {
      if (got == null) trueNegative += 1;
      else falsePositive += 1;
      continue;
    }

    if (got === label.expectedSymbolId) truePositive += 1;
    else if (got == null) falseNegative += 1;
    else falsePositive += 1;
  }

  return scoreMetrics({ truePositive, falsePositive, falseNegative, trueNegative });
}

/** Gate A acceptance floors — raise only when fixtures expand and stay green. */
export const GATE_A_SCORE_FLOORS = {
  modulePrecision: 0.95,
  moduleRecall: 0.9,
  moduleUnresolvedAccuracy: 0.95,
  symbolPrecision: 0.95,
  symbolRecall: 0.9,
  symbolUnresolvedAccuracy: 0.95
} as const;

/** Keep resolveJsModule export reachable for ad-hoc fixture debugging. */
export { resolveJsModule };
