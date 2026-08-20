import { getPrisma } from '../db/prisma';
import { getModuleDependencyTraversal } from './dependencyGraphQueries';
import { getCoChanges } from './engineeringIntelligence';
import { resolveRepositoryRevision } from './repositoryRevisions';

export type ImpactRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export type ImpactTestRecommendation = {
  filePath: string;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM';
};

export type ImpactAnalysisResult = {
  target: { filePath: string };
  revisionSha: string;
  risk: ImpactRisk;
  directDependents: string[];
  transitiveDependents: string[];
  outboundImports: string[];
  relevantTests: ImpactTestRecommendation[];
  coChanges: Array<{ file: string; pairedWith: string; count: number }>;
  hotspot: { score: number; changeCount: number; reasons: string[] } | null;
  checklist: string[];
  summary: string;
};

/** Detect test modules across TS/JS, Python, and Go — the languages we index. */
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

  const prisma = getPrisma();
  const fileRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "id"
      FROM "File"
      WHERE "repositoryId" = $1
        AND "revisionId" = $2
        AND "path" = $3
      LIMIT 1
    `,
    args.repositoryId,
    revision.id,
    args.filePath
  )) as Array<{ id: string }>;
  if (!fileRows[0]) return null;

  const traversal = await getModuleDependencyTraversal({
    repositoryId: args.repositoryId,
    filePath: args.filePath,
    revisionSha: args.revisionSha,
    depthLimit: args.depth
  });
  if (!traversal) return null;

  const directDependents = traversal.directModuleDependents.map((edge) => edge.fromModule);
  const transitiveDependents = traversal.transitiveModuleDependents.map((edge) => edge.fromModule);

  const outboundRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "toModule"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
        AND "fromModule" = $2
    `,
    revision.id,
    args.filePath
  )) as Array<{ toModule: string }>;
  const outboundImports = outboundRows.map((row) => row.toModule);

  const relevantTests = await findTestsForModule({
    revisionId: revision.id,
    filePath: args.filePath,
    dependentModules: directDependents
  });

  const coChanges = await getCoChanges({
    repositoryId: args.repositoryId,
    filePath: args.filePath,
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
    args.filePath
  )) as Array<{ score: number; changeCount: number; reasons: string[] }>;
  const hotspotRow = hotspotRows[0];

  const risk = computeRisk({
    directCount: directDependents.length,
    transitiveCount: transitiveDependents.length,
    hotspotScore: hotspotRow?.score ?? 0,
    testCount: relevantTests.length
  });

  const summary = [
    `${args.filePath} has ${directDependents.length} direct and ${transitiveDependents.length} transitive dependent module(s).`,
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
    target: { filePath: args.filePath },
    revisionSha: revision.revisionSha,
    risk,
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
