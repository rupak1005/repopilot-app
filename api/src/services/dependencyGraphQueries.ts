import { getPrisma } from '../db/prisma';
import { resolveRepositoryRevision } from './repositoryRevisions';

type AdjacencyMap = Map<string, Set<string>>;

type DependencySymbolNode = {
  symbolId: string;
  name: string;
  type: string;
};

type ModuleDependencyEdge = {
  fromModule: string;
  toModule: string;
};

export type SymbolDependencyTraversalResponse = {
  symbol: DependencySymbolNode;
  directCallers: DependencySymbolNode[];
  transitiveCallers: DependencySymbolNode[];
  graphDepth: number;
  cycleDetected: boolean;
};

export type ModuleDependencyTraversalResponse = {
  file: {
    filePath: string;
  };
  directModuleDependents: ModuleDependencyEdge[];
  transitiveModuleDependents: ModuleDependencyEdge[];
  graphDepth: number;
};

type SymbolRow = {
  symbolId: string;
  name: string;
  type: string;
};

function breadthFirstExpand(args: {
  startIds: string[];
  adjacency: AdjacencyMap;
  depthLimit: number;
}): string[] {
  const visited = new Set<string>(args.startIds);
  const queue = args.startIds.map((id) => ({ id, depth: 1 }));
  const ordered: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    ordered.push(current.id);
    if (current.depth >= args.depthLimit) continue;

    for (const next of args.adjacency.get(current.id) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push({ id: next, depth: current.depth + 1 });
    }
  }

  return ordered;
}

function findStronglyConnectedComponents(adjacency: AdjacencyMap): string[][] {
  let index = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  function strongConnect(node: string) {
    indices.set(node, index);
    lowLinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const neighbor of adjacency.get(node) ?? []) {
      if (!indices.has(neighbor)) {
        strongConnect(neighbor);
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node) ?? Number.MAX_SAFE_INTEGER, lowLinks.get(neighbor) ?? 0)
        );
      } else if (onStack.has(neighbor)) {
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node) ?? Number.MAX_SAFE_INTEGER, indices.get(neighbor) ?? 0)
        );
      }
    }

    if (lowLinks.get(node) === indices.get(node)) {
      const component: string[] = [];
      let current: string | undefined;
      do {
        current = stack.pop();
        if (!current) break;
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      components.push(component);
    }
  }

  for (const node of adjacency.keys()) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  return components;
}

async function loadSymbolLookup(args: {
  repositoryId: string;
  revisionId: string;
}): Promise<Map<string, DependencySymbolNode>> {
  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT s.id AS "symbolId", s.name, s.type
      FROM "Symbol" s
      JOIN "File" f ON f.id = s."fileId"
      WHERE f."repositoryId" = $1
        AND f."revisionId" = $2
    `,
    args.repositoryId,
    args.revisionId
  )) as SymbolRow[];

  return new Map(
    rows.map((row) => [
      row.symbolId,
      {
        symbolId: row.symbolId,
        name: row.name,
        type: row.type
      }
    ])
  );
}

async function loadSymbolAdjacency(args: {
  revisionId: string;
  reverse?: boolean;
}): Promise<AdjacencyMap> {
  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT sd."fromSymbolId", sd."toSymbolId"
      FROM "SymbolDependency" sd
      WHERE sd."revisionId" = $1
    `,
    args.revisionId
  )) as Array<{ fromSymbolId: string; toSymbolId: string }>;

  const adjacency: AdjacencyMap = new Map();
  for (const row of rows) {
    const from = args.reverse ? row.toSymbolId : row.fromSymbolId;
    const to = args.reverse ? row.fromSymbolId : row.toSymbolId;
    if (!adjacency.has(from)) adjacency.set(from, new Set<string>());
    adjacency.get(from)?.add(to);
  }

  return adjacency;
}

export async function getSymbolDependencyTraversal(args: {
  repositoryId: string;
  symbolId: string;
  revisionSha?: string;
  depthLimit?: number;
}): Promise<SymbolDependencyTraversalResponse | null> {
  const depthLimit = Math.max(1, args.depthLimit ?? 2);
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return null;

  const symbolLookup = await loadSymbolLookup({
    repositoryId: args.repositoryId,
    revisionId: revision.id
  });
  const symbol = symbolLookup.get(args.symbolId);
  if (!symbol) return null;

  const reverseAdjacency = await loadSymbolAdjacency({
    revisionId: revision.id,
    reverse: true
  });
  const forwardAdjacency = await loadSymbolAdjacency({
    revisionId: revision.id,
    reverse: false
  });

  const directCallerIds = Array.from(reverseAdjacency.get(args.symbolId) ?? []);
  const transitiveCallerIds = breadthFirstExpand({
    startIds: directCallerIds,
    adjacency: reverseAdjacency,
    depthLimit
  }).filter((id) => !directCallerIds.includes(id));

  const cyclicSymbolIds = new Set<string>();
  for (const component of findStronglyConnectedComponents(forwardAdjacency)) {
    const selfLoop =
      component.length === 1 &&
      forwardAdjacency.get(component[0])?.has(component[0]) === true;
    if (component.length > 1 || selfLoop) {
      for (const symbolId of component) {
        cyclicSymbolIds.add(symbolId);
      }
    }
  }

  const toNodes = (ids: string[]): DependencySymbolNode[] =>
    ids
      .map((id) => symbolLookup.get(id))
      .filter((node): node is DependencySymbolNode => Boolean(node));

  return {
    symbol,
    directCallers: toNodes(directCallerIds),
    transitiveCallers: toNodes(transitiveCallerIds),
    graphDepth: depthLimit,
    cycleDetected: cyclicSymbolIds.has(args.symbolId)
  };
}

export async function getModuleDependencyTraversal(args: {
  repositoryId: string;
  filePath: string;
  revisionSha?: string;
  depthLimit?: number;
}): Promise<ModuleDependencyTraversalResponse | null> {
  const depthLimit = Math.max(1, args.depthLimit ?? 2);
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return null;

  const prisma = getPrisma();
  // Module graph nodes can be unresolved import aliases (e.g. `@/…`) that are not File rows.
  // Prefer File existence when present; otherwise allow any module that appears in ModuleDependency.
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

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "fromModule", "toModule"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
    `,
    revision.id
  )) as ModuleDependencyEdge[];

  const inGraph = rows.some(
    (row) => row.fromModule === args.filePath || row.toModule === args.filePath
  );
  if (!fileRows[0] && !inGraph) return null;

  const adjacency: Map<string, Set<string>> = new Map();
  const reverseAdjacency: Map<string, Set<string>> = new Map();

  for (const row of rows) {
    if (!adjacency.has(row.fromModule)) adjacency.set(row.fromModule, new Set<string>());
    adjacency.get(row.fromModule)?.add(row.toModule);

    if (!reverseAdjacency.has(row.toModule)) reverseAdjacency.set(row.toModule, new Set<string>());
    reverseAdjacency.get(row.toModule)?.add(row.fromModule);
  }

  const directDependents = Array.from(reverseAdjacency.get(args.filePath) ?? []).map(
    (fromModule) => ({
      fromModule,
      toModule: args.filePath
    })
  );

  const transitiveIds = breadthFirstExpand({
    startIds: directDependents.map((edge) => edge.fromModule),
    adjacency: reverseAdjacency,
    depthLimit
  }).filter((moduleName) => !directDependents.some((edge) => edge.fromModule === moduleName));

  return {
    file: {
      filePath: args.filePath
    },
    directModuleDependents: directDependents,
    transitiveModuleDependents: transitiveIds.map((fromModule) => ({
      fromModule,
      toModule: args.filePath
    })),
    graphDepth: depthLimit
  };
}

export { breadthFirstExpand, findStronglyConnectedComponents };

/** SCCs that are actual cycles (size > 1 or self-loop). */
export function cyclicComponents(adjacency: AdjacencyMap): string[][] {
  return findStronglyConnectedComponents(adjacency).filter((component) => {
    const selfLoop =
      component.length === 1 && adjacency.get(component[0]!)?.has(component[0]!) === true;
    return component.length > 1 || selfLoop;
  });
}

export type ModuleCyclesResult = {
  revisionSha: string;
  cycles: string[][];
  count: number;
};

export async function listModuleCycles(args: {
  repositoryId: string;
  revisionSha?: string;
  /** Max cycles to return (largest first). */
  limit?: number;
}): Promise<ModuleCyclesResult | null> {
  const limit = Math.max(1, Math.min(args.limit ?? 25, 100));
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return null;

  const prisma = getPrisma();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT "fromModule", "toModule"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
    `,
    revision.id
  )) as Array<{ fromModule: string; toModule: string }>;

  const adjacency: AdjacencyMap = new Map();
  for (const row of rows) {
    if (!adjacency.has(row.fromModule)) adjacency.set(row.fromModule, new Set());
    adjacency.get(row.fromModule)!.add(row.toModule);
    if (!adjacency.has(row.toModule)) adjacency.set(row.toModule, new Set());
  }

  const cycles = cyclicComponents(adjacency)
    .map((c) => [...c].sort())
    .sort((a, b) => b.length - a.length || a[0]!.localeCompare(b[0]!))
    .slice(0, limit);

  return {
    revisionSha: revision.revisionSha,
    cycles,
    count: cycles.length
  };
}

