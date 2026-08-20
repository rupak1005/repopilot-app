import { getPrisma } from '../db/prisma';
import {
  getModuleDependencyTraversal,
  getSymbolDependencyTraversal
} from './dependencyGraphQueries';
import { getCoChanges } from './engineeringIntelligence';
import {
  buildFileChangesFromRevisions,
  getPullRequestDetails
} from './prReview';
import { resolveRepositoryRevision } from './repositoryRevisions';

export type ImpactRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export type ImpactConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type ImpactRiskFactor = {
  id: string;
  label: string;
  detail: string;
  severity: 'info' | 'warn' | 'danger';
};

export type ImpactTestRecommendation = {
  filePath: string;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM';
};

export type ImpactAnalysisResult = {
  target: { filePath: string };
  revisionSha: string;
  risk: ImpactRisk;
  confidence: ImpactConfidence;
  riskFactors: ImpactRiskFactor[];
  directDependents: string[];
  transitiveDependents: string[];
  outboundImports: string[];
  relevantTests: ImpactTestRecommendation[];
  coChanges: Array<{ file: string; pairedWith: string; count: number }>;
  hotspot: { score: number; changeCount: number; reasons: string[] } | null;
  checklist: string[];
  summary: string;
};

export function isTestFile(filePath: string): boolean {
  const lower = filePath.toLowerCase().split('\\').join('/');
  const base = lower.slice(lower.lastIndexOf('/') + 1);
  return (
    lower.includes('/__tests__/') ||
    lower.includes('/test/') ||
    lower.includes('/tests/') ||
    /\.(test|spec)\.(c|m)?(t|j)sx?$/.test(base) ||
    base.startsWith('test_') ||
    base.endsWith('_test.py') ||
    base.endsWith('_test.go')
  );
}

export function computeRisk(args: {
  directCount: number;
  transitiveCount: number;
  hotspotScore: number;
  testCount: number;
}): ImpactRisk {
  const wideBlast = args.transitiveCount >= 10 || args.directCount >= 5 || args.hotspotScore >= 40;
  if (wideBlast) return 'HIGH';
  const someBlast = args.directCount >= 1 || args.transitiveCount >= 3 || args.hotspotScore >= 15;
  if (someBlast && args.testCount === 0) return 'HIGH';
  if (someBlast) return 'MEDIUM';
  return 'LOW';
}

export function computeImpactConfidence(args: {
  directCount: number;
  transitiveCount: number;
  testCount: number;
  hasHotspot: boolean;
}): ImpactConfidence {
  const blast = args.directCount + args.transitiveCount;
  if (blast === 0 && !args.hasHotspot) return 'MEDIUM';
  if (blast >= 3 && args.testCount === 0) return 'MEDIUM';
  if (blast >= 8 && args.testCount > 0) return 'HIGH';
  return 'HIGH';
}

export function buildRiskFactors(args: {
  directCount: number;
  transitiveCount: number;
  testCount: number;
  hotspotScore: number;
  coChangeCount: number;
}): ImpactRiskFactor[] {
  const factors: ImpactRiskFactor[] = [];
  if (args.directCount > 0) {
    factors.push({
      id: 'direct',
      label: 'Direct dependents',
      detail: `${args.directCount} module${args.directCount === 1 ? '' : 's'} import this file`,
      severity: args.directCount >= 5 ? 'danger' : args.directCount >= 2 ? 'warn' : 'info'
    });
  }
  if (args.transitiveCount > 0) {
    factors.push({
      id: 'transitive',
      label: 'Transitive blast radius',
      detail: `${args.transitiveCount} downstream module${args.transitiveCount === 1 ? '' : 's'}`,
      severity: args.transitiveCount >= 10 ? 'danger' : args.transitiveCount >= 3 ? 'warn' : 'info'
    });
  }
  factors.push({
    id: 'tests',
    label: args.testCount > 0 ? 'Test coverage signal' : 'Missing tests',
    detail:
      args.testCount > 0
        ? `${args.testCount} related test file${args.testCount === 1 ? '' : 's'} found`
        : 'No test files import this module or its direct dependents',
    severity: args.testCount === 0 ? 'danger' : 'info'
  });
  if (args.hotspotScore > 0) {
    factors.push({
      id: 'churn',
      label: 'Hotspot churn',
      detail: `Hotspot score ${args.hotspotScore.toFixed(0)}`,
      severity: args.hotspotScore >= 40 ? 'danger' : args.hotspotScore >= 15 ? 'warn' : 'info'
    });
  }
  if (args.coChangeCount > 0) {
    factors.push({
      id: 'cochange',
      label: 'Co-change coupling',
      detail: `${args.coChangeCount} frequently co-changed file${args.coChangeCount === 1 ? '' : 's'}`,
      severity: args.coChangeCount >= 3 ? 'warn' : 'info'
    });
  }
  return factors;
}

function buildChecklist(args: {
  risk: ImpactRisk;
  directDependents: string[];
  tests: ImpactTestRecommendation[];
  coChanges: ImpactAnalysisResult['coChanges'];
}): string[] {
  const items = [
    'Confirm direct dependents still behave correctly after your change.',
    args.tests.length > 0
      ? `Run ${args.tests.length} recommended test file${args.tests.length === 1 ? '' : 's'}.`
      : 'Add or locate tests — none import this module directly.'
  ];

  if (args.directDependents.length > 0) {
    items.push(`Review ${args.directDependents.length} direct dependent module(s).`);
  }
  if (args.coChanges.length > 0) {
    items.push('Check co-change history — this file often changes with related modules.');
  }
  if (args.risk === 'HIGH') {
    items.push('Consider splitting the change or scheduling extra review — blast radius is high.');
  }

  return items;
}

async function findTestsForModule(args: {
  revisionId: string;
  filePath: string;
  dependentModules: string[];
}): Promise<ImpactTestRecommendation[]> {
  const prisma = getPrisma();
  const modules = [args.filePath, ...args.dependentModules.slice(0, 8)];
  const tests: ImpactTestRecommendation[] = [];
  const seen = new Set<string>();

  for (const modulePath of modules) {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT DISTINCT "fromModule"
        FROM "ModuleDependency"
        WHERE "revisionId" = $1
          AND "toModule" = $2
      `,
      args.revisionId,
      modulePath
    )) as Array<{ fromModule: string }>;

    for (const row of rows) {
      if (!isTestFile(row.fromModule) || seen.has(row.fromModule)) continue;
      seen.add(row.fromModule);
      tests.push({
        filePath: row.fromModule,
        reason:
          modulePath === args.filePath
            ? 'Imports the target module directly.'
            : `Imports dependent module ${modulePath}.`,
        confidence: modulePath === args.filePath ? 'HIGH' : 'MEDIUM'
      });
    }
  }

  return tests;
}

export async function analyzeFileImpact(args: {
  repositoryId: string;
  filePath: string;
  revisionSha?: string;
  depth?: number;
}): Promise<ImpactAnalysisResult | null> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return null;

  // Prefer a real File.path when the graph node is an import alias (`@/…`).
  const resolvedPath = await resolveIndexedFilePath({
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    moduleId: args.filePath
  });
  const targetPath = resolvedPath ?? args.filePath;

  const traversal = await getModuleDependencyTraversal({
    repositoryId: args.repositoryId,
    filePath: args.filePath,
    revisionSha: args.revisionSha,
    depthLimit: args.depth
  });
  if (!traversal) {
    // Retry with resolved disk path when the alias itself isn't a graph key.
    if (resolvedPath && resolvedPath !== args.filePath) {
      const retry = await getModuleDependencyTraversal({
        repositoryId: args.repositoryId,
        filePath: resolvedPath,
        revisionSha: args.revisionSha,
        depthLimit: args.depth
      });
      if (!retry) return null;
      return finalizeImpact({
        repositoryId: args.repositoryId,
        revisionId: revision.id,
        revisionSha: revision.revisionSha,
        displayPath: args.filePath,
        graphPath: resolvedPath,
        traversal: retry
      });
    }
    return null;
  }

  return finalizeImpact({
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    revisionSha: revision.revisionSha,
    displayPath: args.filePath,
    graphPath: args.filePath,
    fileLookupPath: targetPath,
    traversal
  });
}

async function resolveIndexedFilePath(args: {
  repositoryId: string;
  revisionId: string;
  moduleId: string;
}): Promise<string | null> {
  const prisma = getPrisma();
  const exact = (await prisma.$queryRawUnsafe(
    `
      SELECT "path"
      FROM "File"
      WHERE "repositoryId" = $1
        AND "revisionId" = $2
        AND "path" = $3
      LIMIT 1
    `,
    args.repositoryId,
    args.revisionId,
    args.moduleId
  )) as Array<{ path: string }>;
  if (exact[0]) return exact[0].path;

  const stripped = args.moduleId.replace(/^@\//, '').replace(/^@/, '');
  if (!stripped || stripped === args.moduleId) return null;

  const candidates = [
    stripped,
    `${stripped}.ts`,
    `${stripped}.tsx`,
    `${stripped}.js`,
    `${stripped}.jsx`,
    `${stripped}/index.ts`,
    `${stripped}/index.tsx`,
    `src/${stripped}`,
    `src/${stripped}.ts`,
    `src/${stripped}.tsx`,
    `src/${stripped}.js`,
    `src/${stripped}.jsx`
  ];

  const hit = (await prisma.$queryRawUnsafe(
    `
      SELECT "path"
      FROM "File"
      WHERE "repositoryId" = $1
        AND "revisionId" = $2
        AND "path" = ANY($3::text[])
      LIMIT 1
    `,
    args.repositoryId,
    args.revisionId,
    candidates
  )) as Array<{ path: string }>;
  if (hit[0]) return hit[0].path;

  const fuzzy = (await prisma.$queryRawUnsafe(
    `
      SELECT "path"
      FROM "File"
      WHERE "repositoryId" = $1
        AND "revisionId" = $2
        AND (
          "path" = $3
          OR "path" LIKE $4
          OR "path" LIKE $5
          OR "path" LIKE $6
        )
      ORDER BY LENGTH("path") ASC
      LIMIT 1
    `,
    args.repositoryId,
    args.revisionId,
    stripped,
    `%/${stripped}`,
    `%/${stripped}.%`,
    `${stripped}.%`
  )) as Array<{ path: string }>;
  return fuzzy[0]?.path ?? null;
}

export { resolveIndexedFilePath };

async function finalizeImpact(args: {
  repositoryId: string;
  revisionId: string;
  revisionSha: string;
  displayPath: string;
  graphPath: string;
  fileLookupPath?: string;
  traversal: NonNullable<Awaited<ReturnType<typeof getModuleDependencyTraversal>>>;
}): Promise<ImpactAnalysisResult> {
  const prisma = getPrisma();
  const lookupPath = args.fileLookupPath ?? args.graphPath;
  const directDependents = args.traversal.directModuleDependents.map((edge) => edge.fromModule);
  const transitiveDependents = args.traversal.transitiveModuleDependents.map(
    (edge) => edge.fromModule
  );

  const outboundRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "toModule"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
        AND "fromModule" = $2
    `,
    args.revisionId,
    args.graphPath
  )) as Array<{ toModule: string }>;
  const outboundImports = outboundRows.map((row) => row.toModule);

  const relevantTests = await findTestsForModule({
    revisionId: args.revisionId,
    filePath: lookupPath,
    dependentModules: directDependents
  });

  const coChanges = await getCoChanges({
    repositoryId: args.repositoryId,
    filePath: lookupPath,
    topK: 5
  });

  const hotspotRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "score", "changeCount", "reasons"
      FROM "ModuleHotspot"
      WHERE "repositoryId" = $1
        AND "filePath" = $2
      LIMIT 1
    `,
    args.repositoryId,
    lookupPath
  )) as Array<{ score: number; changeCount: number; reasons: string[] }>;
  const hotspotRow = hotspotRows[0];

  const risk = computeRisk({
    directCount: directDependents.length,
    transitiveCount: transitiveDependents.length,
    hotspotScore: hotspotRow?.score ?? 0,
    testCount: relevantTests.length
  });
  const confidence = computeImpactConfidence({
    directCount: directDependents.length,
    transitiveCount: transitiveDependents.length,
    testCount: relevantTests.length,
    hasHotspot: Boolean(hotspotRow && hotspotRow.score > 0)
  });
  const riskFactors = buildRiskFactors({
    directCount: directDependents.length,
    transitiveCount: transitiveDependents.length,
    testCount: relevantTests.length,
    hotspotScore: hotspotRow?.score ?? 0,
    coChangeCount: coChanges.length
  });

  const summary = [
    `${args.displayPath} has ${directDependents.length} direct and ${transitiveDependents.length} transitive dependent module(s).`,
    relevantTests.length > 0
      ? `${relevantTests.length} test file(s) import this area.`
      : 'No test files directly import this module.',
    hotspotRow && hotspotRow.score > 0
      ? `Hotspot score ${hotspotRow.score.toFixed(0)} from ${hotspotRow.changeCount} recent changes.`
      : null
  ]
    .filter(Boolean)
    .join(' ');

  return {
    target: { filePath: args.displayPath },
    revisionSha: args.revisionSha,
    risk,
    confidence,
    riskFactors,
    directDependents,
    transitiveDependents,
    outboundImports,
    relevantTests,
    coChanges,
    hotspot: hotspotRow
      ? {
          score: hotspotRow.score,
          changeCount: hotspotRow.changeCount,
          reasons: Array.isArray(hotspotRow.reasons) ? hotspotRow.reasons : []
        }
      : null,
    checklist: buildChecklist({ risk, directDependents, tests: relevantTests, coChanges }),
    summary
  };
}

export type PullImpactAnalysisResult = {
  mode: 'pull';
  pullNumber: number;
  title: string;
  revisionSha: string;
  risk: ImpactRisk;
  confidence: ImpactConfidence;
  riskFactors: ImpactRiskFactor[];
  changedFiles: string[];
  analyzedFiles: string[];
  skippedFiles: number;
  directDependents: string[];
  transitiveDependents: string[];
  relevantTests: ImpactTestRecommendation[];
  fileRisks: Array<{ filePath: string; risk: ImpactRisk; confidence: ImpactConfidence }>;
  checklist: string[];
  summary: string;
};

const RISK_RANK: Record<ImpactRisk, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const CONF_RANK: Record<ImpactConfidence, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function maxRisk(a: ImpactRisk, b: ImpactRisk): ImpactRisk {
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b;
}

function minConfidence(a: ImpactConfidence, b: ImpactConfidence): ImpactConfidence {
  return CONF_RANK[a] >= CONF_RANK[b] ? a : b;
}

/** Aggregate file-level impact across a PR’s changed modules (bounded). */
export async function analyzePullImpact(args: {
  repositoryId: string;
  pullNumber: number;
  depth?: number;
  /** Max changed files to analyze individually. */
  fileLimit?: number;
}): Promise<PullImpactAnalysisResult | null> {
  const details = await getPullRequestDetails({
    repositoryId: args.repositoryId,
    pullNumber: args.pullNumber
  });
  if (!details) return null;

  const fileLimit = Math.max(1, Math.min(args.fileLimit ?? 12, 24));
  const changes = await buildFileChangesFromRevisions({
    repositoryId: args.repositoryId,
    baseRevision: details.baseRevision,
    headRevision: details.headRevision
  });

  const changedFiles = changes
    .filter((change) => change.status !== 'deleted')
    .map((change) => change.path);
  const toAnalyze = changedFiles.slice(0, fileLimit);
  const skippedFiles = Math.max(0, changedFiles.length - toAnalyze.length);

  const fileResults: ImpactAnalysisResult[] = [];
  for (const filePath of toAnalyze) {
    const result = await analyzeFileImpact({
      repositoryId: args.repositoryId,
      filePath,
      revisionSha: details.headRevision,
      depth: args.depth
    });
    if (result) fileResults.push(result);
  }

  const directDependents = [
    ...new Set(fileResults.flatMap((r) => r.directDependents))
  ].filter((path) => !changedFiles.includes(path));
  const transitiveDependents = [
    ...new Set(fileResults.flatMap((r) => r.transitiveDependents))
  ].filter((path) => !changedFiles.includes(path) && !directDependents.includes(path));
  const relevantTests = Array.from(
    new Map(
      fileResults.flatMap((r) => r.relevantTests).map((t) => [t.filePath, t] as const)
    ).values()
  );

  let risk: ImpactRisk = 'LOW';
  let confidence: ImpactConfidence = 'HIGH';
  for (const result of fileResults) {
    risk = maxRisk(risk, result.risk);
    confidence = minConfidence(confidence, result.confidence);
  }
  if (fileResults.length === 0 && changedFiles.length > 0) {
    confidence = 'MEDIUM';
  }

  const highRiskFiles = fileResults.filter((r) => r.risk === 'HIGH').length;
  const riskFactors = buildRiskFactors({
    directCount: directDependents.length,
    transitiveCount: transitiveDependents.length,
    testCount: relevantTests.length,
    hotspotScore: Math.max(0, ...fileResults.map((r) => r.hotspot?.score ?? 0)),
    coChangeCount: fileResults.reduce((sum, r) => sum + r.coChanges.length, 0)
  });
  if (highRiskFiles > 0) {
    riskFactors.unshift({
      id: 'files',
      label: 'High-risk changed files',
      detail: `${highRiskFiles} of ${fileResults.length} analyzed file${fileResults.length === 1 ? '' : 's'} ranked HIGH`,
      severity: 'danger'
    });
  }
  if (skippedFiles > 0) {
    riskFactors.push({
      id: 'truncated',
      label: 'Partial analysis',
      detail: `${skippedFiles} changed file${skippedFiles === 1 ? '' : 's'} not analyzed (limit ${fileLimit})`,
      severity: 'warn'
    });
  }

  const checklist = [
    `Review ${changedFiles.length} changed file${changedFiles.length === 1 ? '' : 's'} in PR #${args.pullNumber}.`,
    relevantTests.length > 0
      ? `Run ${relevantTests.length} recommended test file${relevantTests.length === 1 ? '' : 's'}.`
      : 'Locate or add tests covering the changed modules.',
    directDependents.length > 0
      ? `Check ${directDependents.length} direct dependent module${directDependents.length === 1 ? '' : 's'} outside the PR.`
      : 'No external direct dependents detected for analyzed files.',
    risk === 'HIGH'
      ? 'Blast radius is HIGH — prefer smaller PRs or extra review.'
      : 'Confirm CI and review findings before merge.'
  ];

  const summary = [
    `PR #${args.pullNumber} (${details.title}) touches ${changedFiles.length} file${changedFiles.length === 1 ? '' : 's'}.`,
    `Analyzed ${fileResults.length} module${fileResults.length === 1 ? '' : 's'} → ${directDependents.length} direct / ${transitiveDependents.length} transitive dependents outside the change set.`,
    relevantTests.length > 0
      ? `${relevantTests.length} related test file(s) found.`
      : 'No related test files found for analyzed modules.'
  ].join(' ');

  return {
    mode: 'pull',
    pullNumber: args.pullNumber,
    title: details.title,
    revisionSha: details.headRevision,
    risk,
    confidence,
    riskFactors,
    changedFiles,
    analyzedFiles: fileResults.map((r) => r.target.filePath),
    skippedFiles,
    directDependents,
    transitiveDependents,
    relevantTests,
    fileRisks: fileResults.map((r) => ({
      filePath: r.target.filePath,
      risk: r.risk,
      confidence: r.confidence
    })),
    checklist,
    summary
  };
}

/** Pure helper for unit tests — merges per-file risks into a PR risk. */
export function mergePullRisks(risks: ImpactRisk[]): ImpactRisk {
  return risks.reduce<ImpactRisk>((acc, risk) => maxRisk(acc, risk), 'LOW');
}

export type SymbolImpactAnalysisResult = {
  mode: 'symbol';
  target: {
    symbolId: string;
    name: string;
    type: string;
    filePath: string;
  };
  revisionSha: string;
  risk: ImpactRisk;
  confidence: ImpactConfidence;
  riskFactors: ImpactRiskFactor[];
  directCallers: Array<{ symbolId: string; name: string; type: string }>;
  transitiveCallers: Array<{ symbolId: string; name: string; type: string }>;
  cycleDetected: boolean;
  relevantTests: ImpactTestRecommendation[];
  coChanges: Array<{ file: string; pairedWith: string; count: number }>;
  hotspot: { score: number; changeCount: number; reasons: string[] } | null;
  checklist: string[];
  summary: string;
};

async function resolveSymbolTarget(args: {
  repositoryId: string;
  revisionId: string;
  symbolId?: string;
  symbolName?: string;
}): Promise<{
  symbolId: string;
  name: string;
  type: string;
  filePath: string;
} | null> {
  const prisma = getPrisma();
  if (args.symbolId?.trim()) {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT s.id AS "symbolId", s.name, s.type, f.path AS "filePath"
        FROM "Symbol" s
        JOIN "File" f ON f.id = s."fileId"
        WHERE f."repositoryId" = $1
          AND f."revisionId" = $2
          AND s.id = $3::uuid
        LIMIT 1
      `,
      args.repositoryId,
      args.revisionId,
      args.symbolId.trim()
    )) as Array<{ symbolId: string; name: string; type: string; filePath: string }>;
    return rows[0] ?? null;
  }

  const name = args.symbolName?.trim();
  if (!name) return null;

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT s.id AS "symbolId", s.name, s.type, f.path AS "filePath"
      FROM "Symbol" s
      JOIN "File" f ON f.id = s."fileId"
      WHERE f."repositoryId" = $1
        AND f."revisionId" = $2
        AND s.name = $3
      ORDER BY s."startLine" ASC
      LIMIT 5
    `,
    args.repositoryId,
    args.revisionId,
    name
  )) as Array<{ symbolId: string; name: string; type: string; filePath: string }>;

  return rows[0] ?? null;
}

export async function analyzeSymbolImpact(args: {
  repositoryId: string;
  symbolId?: string;
  symbolName?: string;
  revisionSha?: string;
  depth?: number;
}): Promise<SymbolImpactAnalysisResult | null> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return null;

  const target = await resolveSymbolTarget({
    repositoryId: args.repositoryId,
    revisionId: revision.id,
    symbolId: args.symbolId,
    symbolName: args.symbolName
  });
  if (!target) return null;

  const traversal = await getSymbolDependencyTraversal({
    repositoryId: args.repositoryId,
    symbolId: target.symbolId,
    revisionSha: revision.revisionSha,
    depthLimit: args.depth
  });
  if (!traversal) return null;

  const directCallers = traversal.directCallers;
  const transitiveCallers = traversal.transitiveCallers;
  const relevantTests = await findTestsForModule({
    revisionId: revision.id,
    filePath: target.filePath,
    dependentModules: []
  });
  const coChanges = await getCoChanges({
    repositoryId: args.repositoryId,
    filePath: target.filePath,
    topK: 5
  });

  const prisma = getPrisma();
  const hotspotRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "score", "changeCount", "reasons"
      FROM "ModuleHotspot"
      WHERE "repositoryId" = $1
        AND "filePath" = $2
      LIMIT 1
    `,
    args.repositoryId,
    target.filePath
  )) as Array<{ score: number; changeCount: number; reasons: string[] }>;
  const hotspotRow = hotspotRows[0];

  const risk = computeRisk({
    directCount: directCallers.length,
    transitiveCount: transitiveCallers.length,
    hotspotScore: hotspotRow?.score ?? 0,
    testCount: relevantTests.length
  });
  const confidence = computeImpactConfidence({
    directCount: directCallers.length,
    transitiveCount: transitiveCallers.length,
    testCount: relevantTests.length,
    hasHotspot: Boolean(hotspotRow && hotspotRow.score > 0)
  });

  const riskFactors = buildRiskFactors({
    directCount: directCallers.length,
    transitiveCount: transitiveCallers.length,
    testCount: relevantTests.length,
    hotspotScore: hotspotRow?.score ?? 0,
    coChangeCount: coChanges.length
  }).map((factor) => {
    if (factor.id === 'direct') {
      return {
        ...factor,
        label: 'Direct callers',
        detail: `${directCallers.length} symbol${directCallers.length === 1 ? '' : 's'} call this target`
      };
    }
    if (factor.id === 'transitive') {
      return {
        ...factor,
        label: 'Transitive callers',
        detail: `${transitiveCallers.length} indirect caller${transitiveCallers.length === 1 ? '' : 's'}`
      };
    }
    return factor;
  });

  if (traversal.cycleDetected) {
    riskFactors.unshift({
      id: 'cycle',
      label: 'Call cycle',
      detail: 'This symbol participates in a strongly connected call component',
      severity: 'danger'
    });
  }

  const checklist = [
    'Inspect direct callers before changing the symbol signature or behavior.',
    relevantTests.length > 0
      ? `Run ${relevantTests.length} recommended test file${relevantTests.length === 1 ? '' : 's'} for ${target.filePath}.`
      : `Add tests covering ${target.name} in ${target.filePath}.`,
    traversal.cycleDetected
      ? 'Break or carefully review the call cycle before merging.'
      : 'Confirm no unintended recursive call paths.',
    risk === 'HIGH'
      ? 'High caller blast radius — prefer a compatibility shim or staged rollout.'
      : 'Re-run search for remaining references after the change.'
  ];

  const summary = [
    `${target.type} ${target.name} in ${target.filePath} has ${directCallers.length} direct and ${transitiveCallers.length} transitive caller(s).`,
    traversal.cycleDetected ? 'Call cycle detected.' : null,
    relevantTests.length > 0
      ? `${relevantTests.length} related test file(s) found.`
      : 'No related test files found for the containing module.'
  ]
    .filter(Boolean)
    .join(' ');

  return {
    mode: 'symbol',
    target,
    revisionSha: revision.revisionSha,
    risk,
    confidence,
    riskFactors,
    directCallers,
    transitiveCallers,
    cycleDetected: traversal.cycleDetected,
    relevantTests,
    coChanges,
    hotspot: hotspotRow
      ? {
          score: hotspotRow.score,
          changeCount: hotspotRow.changeCount,
          reasons: Array.isArray(hotspotRow.reasons) ? hotspotRow.reasons : []
        }
      : null,
    checklist,
    summary
  };
}
