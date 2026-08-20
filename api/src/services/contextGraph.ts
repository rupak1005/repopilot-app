import {
  type ContextEdgeDetector,
  type ContextEdgeKind,
  type ContextEdgeProvenance,
  type ContextGraphEdge,
  type ContextGraphNode,
  type ContextNodeKind,
  externalNodeId,
  fileNodeId,
  filePathFromNodeId,
  symbolNodeId,
  symbolTypeToNodeKind
} from '@repopilot/common';
import { getPrisma } from '../db/prisma';
import {
  getModuleDependencyTraversal,
  getSymbolDependencyTraversal
} from './dependencyGraphQueries';
import { resolveRepositoryRevision } from './repositoryRevisions';

export type ContextNode = ContextGraphNode;
export type ContextEdge = ContextGraphEdge;

export type ContextGraphSlice = {
  revisionSha: string;
  nodes: ContextNode[];
  edges: ContextEdge[];
  meta?: {
    graphDepth?: number;
    cycleDetected?: boolean;
  };
};

export type ContextGraphView = 'architecture' | 'neighbors';

type ModuleEdgeRow = {
  fromModule: string;
  toModule: string;
  kind: string | null;
  confidence: number | null;
  sourceFile: string | null;
  sourceLine: number | null;
  detector: string | null;
};

function fileLabel(filePath: string): string {
  const parts = filePath.split('/');
  return parts.length <= 2 ? filePath : parts.slice(-2).join('/');
}

function asEdgeKind(raw: string | null | undefined, fallback: ContextEdgeKind): ContextEdgeKind {
  return (raw as ContextEdgeKind) || fallback;
}

function asDetector(raw: string | null | undefined, fallback: ContextEdgeDetector): ContextEdgeDetector {
  return (raw as ContextEdgeDetector) || fallback;
}

function fileNode(args: {
  filePath: string;
  knownFiles?: Set<string>;
  isHotspot?: boolean;
  score?: number;
}): ContextNode {
  const known = !args.knownFiles || args.knownFiles.has(args.filePath);
  const kind: ContextNodeKind = known ? 'File' : 'ExternalDependency';
  return {
    id: known ? fileNodeId(args.filePath) : externalNodeId(args.filePath),
    kind,
    label: fileLabel(args.filePath),
    filePath: args.filePath,
    isHotspot: args.isHotspot,
    score: args.score
  };
}

function symbolNode(args: {
  symbolId: string;
  name: string;
  type: string;
  filePath?: string;
}): ContextNode {
  return {
    id: symbolNodeId(args.symbolId),
    kind: symbolTypeToNodeKind(args.type),
    label: args.name,
    symbolType: args.type,
    filePath: args.filePath
  };
}

function provenanceFromRow(
  row: Pick<ModuleEdgeRow, 'confidence' | 'sourceFile' | 'sourceLine' | 'detector'>,
  revisionSha: string,
  defaults: { confidence: number; detector: ContextEdgeDetector; sourceFile?: string }
): ContextEdgeProvenance {
  return {
    detector: asDetector(row.detector, defaults.detector),
    confidence: row.confidence ?? defaults.confidence,
    sourceFile: row.sourceFile ?? defaults.sourceFile,
    sourceLine: row.sourceLine ?? undefined,
    revisionSha
  };
}

export function moduleEdgesToContextEdges(
  edges: Array<{ fromModule: string; toModule: string }>,
  revisionSha = ''
): ContextEdge[] {
  return edges.map((edge) => ({
    from: fileNodeId(edge.fromModule),
    to: fileNodeId(edge.toModule),
    kind: 'imports',
    provenance: {
      detector: 'parser',
      confidence: 1,
      sourceFile: edge.fromModule,
      revisionSha: revisionSha || undefined
    }
  }));
}

function moduleRowsToContextEdges(rows: ModuleEdgeRow[], revisionSha: string, knownFiles: Set<string>): ContextEdge[] {
  return rows.map((row) => {
    const fromKnown = knownFiles.has(row.fromModule);
    const toKnown = knownFiles.has(row.toModule);
    return {
      from: fromKnown ? fileNodeId(row.fromModule) : externalNodeId(row.fromModule),
      to: toKnown ? fileNodeId(row.toModule) : externalNodeId(row.toModule),
      kind: asEdgeKind(row.kind, 'imports'),
      provenance: provenanceFromRow(row, revisionSha, {
        confidence: 1,
        detector: 'tree-sitter',
        sourceFile: row.fromModule
      })
    };
  });
}

function dedupeNodes(nodes: ContextNode[]): ContextNode[] {
  const seen = new Map<string, ContextNode>();
  for (const node of nodes) {
    if (!seen.has(node.id)) seen.set(node.id, node);
  }
  return Array.from(seen.values());
}

export async function getModuleArchitectureGraph(args: {
  repositoryId: string;
  revisionSha?: string;
}): Promise<ContextGraphSlice> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) {
    return { revisionSha: '', nodes: [], edges: [] };
  }

  const prisma = getPrisma();
  const edgeRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "fromModule", "toModule", "kind", "confidence", "sourceFile", "sourceLine", "detector"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
    `,
    revision.id
  )) as ModuleEdgeRow[];

  const fileRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "path"
      FROM "File"
      WHERE "revisionId" = $1
    `,
    revision.id
  )) as Array<{ path: string }>;
  const knownFiles = new Set(fileRows.map((row) => row.path));

  const hotspotRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "filePath", "score"
      FROM "ModuleHotspot"
      WHERE "repositoryId" = $1
    `,
    args.repositoryId
  )) as Array<{ filePath: string; score: number }>;
  const hotspotMap = new Map(hotspotRows.map((row) => [row.filePath, row.score]));

  const nodePaths = new Set<string>();
  for (const edge of edgeRows) {
    nodePaths.add(edge.fromModule);
    nodePaths.add(edge.toModule);
  }
  for (const hotspot of hotspotRows) {
    nodePaths.add(hotspot.filePath);
  }

  const nodes: ContextNode[] = Array.from(nodePaths).map((filePath) => {
    const score = hotspotMap.get(filePath) ?? 0;
    return fileNode({
      filePath,
      knownFiles,
      isHotspot: score > 0,
      score
    });
  });

  return {
    revisionSha: revision.revisionSha,
    nodes,
    edges: moduleRowsToContextEdges(edgeRows, revision.revisionSha, knownFiles)
  };
}

export async function expandFromFile(args: {
  repositoryId: string;
  filePath: string;
  revisionSha?: string;
  depth?: number;
}): Promise<ContextGraphSlice | null> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return null;

  const traversal = await getModuleDependencyTraversal({
    repositoryId: args.repositoryId,
    filePath: args.filePath,
    revisionSha: args.revisionSha,
    depthLimit: args.depth
  });
  if (!traversal) return null;

  const prisma = getPrisma();
  const outboundRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "toModule", "kind", "confidence", "sourceFile", "sourceLine", "detector"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
        AND "fromModule" = $2
    `,
    revision.id,
    args.filePath
  )) as Array<Omit<ModuleEdgeRow, 'fromModule'> & { toModule: string }>;

  const nodes: ContextNode[] = [fileNode({ filePath: args.filePath })];
  const edges: ContextEdge[] = [];

  for (const edge of traversal.directModuleDependents) {
    nodes.push(fileNode({ filePath: edge.fromModule }));
    edges.push({
      from: fileNodeId(edge.fromModule),
      to: fileNodeId(args.filePath),
      kind: 'imports',
      provenance: {
        detector: 'parser',
        confidence: 1,
        sourceFile: edge.fromModule,
        revisionSha: revision.revisionSha
      }
    });
  }

  for (const edge of traversal.transitiveModuleDependents) {
    nodes.push(fileNode({ filePath: edge.fromModule }));
    edges.push({
      from: fileNodeId(edge.fromModule),
      to: fileNodeId(args.filePath),
      kind: 'imports',
      provenance: {
        detector: 'parser',
        confidence: 1,
        sourceFile: edge.fromModule,
        revisionSha: revision.revisionSha
      }
    });
  }

  for (const row of outboundRows) {
    nodes.push(fileNode({ filePath: row.toModule }));
    edges.push({
      from: fileNodeId(args.filePath),
      to: fileNodeId(row.toModule),
      kind: asEdgeKind(row.kind, 'imports'),
      provenance: provenanceFromRow(
        {
          confidence: row.confidence,
          sourceFile: row.sourceFile,
          sourceLine: row.sourceLine,
          detector: row.detector
        },
        revision.revisionSha,
        { confidence: 1, detector: 'tree-sitter', sourceFile: args.filePath }
      )
    });
  }

  return {
    revisionSha: revision.revisionSha,
    nodes: dedupeNodes(nodes),
    edges,
    meta: { graphDepth: traversal.graphDepth }
  };
}

export async function expandFromSymbol(args: {
  repositoryId: string;
  symbolId: string;
  revisionSha?: string;
  depth?: number;
}): Promise<ContextGraphSlice | null> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return null;

  const traversal = await getSymbolDependencyTraversal({
    repositoryId: args.repositoryId,
    symbolId: args.symbolId,
    revisionSha: args.revisionSha,
    depthLimit: args.depth
  });
  if (!traversal) return null;

  const prisma = getPrisma();
  const edgeRows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        sd."fromSymbolId",
        sd."toSymbolId",
        sd."kind",
        sd."confidence",
        sd."sourceFile",
        sd."sourceLine",
        sd."detector"
      FROM "SymbolDependency" sd
      WHERE sd."revisionId" = $1
        AND sd."toSymbolId" = $2
    `,
    revision.id,
    args.symbolId
  )) as Array<{
    fromSymbolId: string;
    toSymbolId: string;
    kind: string | null;
    confidence: number | null;
    sourceFile: string | null;
    sourceLine: number | null;
    detector: string | null;
  }>;
  const provenanceByCaller = new Map(edgeRows.map((row) => [row.fromSymbolId, row]));

  const nodes: ContextNode[] = [
    symbolNode({
      symbolId: traversal.symbol.symbolId,
      name: traversal.symbol.name,
      type: traversal.symbol.type
    })
  ];
  const edges: ContextEdge[] = [];

  for (const caller of [...traversal.directCallers, ...traversal.transitiveCallers]) {
    nodes.push(
      symbolNode({
        symbolId: caller.symbolId,
        name: caller.name,
        type: caller.type
      })
    );
    const row = provenanceByCaller.get(caller.symbolId);
    edges.push({
      from: symbolNodeId(caller.symbolId),
      to: symbolNodeId(traversal.symbol.symbolId),
      kind: asEdgeKind(row?.kind, 'calls'),
      provenance: {
        detector: asDetector(row?.detector, 'heuristic'),
        confidence: row?.confidence ?? 0.65,
        sourceFile: row?.sourceFile ?? undefined,
        sourceLine: row?.sourceLine ?? undefined,
        revisionSha: revision.revisionSha
      }
    });
  }

  return {
    revisionSha: revision.revisionSha,
    nodes: dedupeNodes(nodes),
    edges,
    meta: {
      graphDepth: traversal.graphDepth,
      cycleDetected: traversal.cycleDetected
    }
  };
}

export function parseContextGraphView(raw?: string): ContextGraphView {
  return raw === 'neighbors' ? 'neighbors' : 'architecture';
}

export async function expandContext(args: {
  repositoryId: string;
  view?: ContextGraphView;
  filePath?: string;
  symbolId?: string;
  revisionSha?: string;
  depth?: number;
}): Promise<ContextGraphSlice | null> {
  const view = args.view ?? 'architecture';

  if (view === 'architecture') {
    return getModuleArchitectureGraph({
      repositoryId: args.repositoryId,
      revisionSha: args.revisionSha
    });
  }

  if (args.symbolId) {
    return expandFromSymbol({
      repositoryId: args.repositoryId,
      symbolId: args.symbolId,
      revisionSha: args.revisionSha,
      depth: args.depth
    });
  }

  if (args.filePath) {
    return expandFromFile({
      repositoryId: args.repositoryId,
      filePath: args.filePath,
      revisionSha: args.revisionSha,
      depth: args.depth
    });
  }

  return null;
}

const DEFAULT_PATH_HOP_LIMIT = 12;

/** Pure bounded BFS on a directed adjacency list. */
export function bfsShortestPath(
  adjacency: Map<string, string[]>,
  fromPath: string,
  toPath: string,
  hopLimit = DEFAULT_PATH_HOP_LIMIT
): string[] | null {
  if (fromPath === toPath) return [fromPath];

  const queue: string[] = [fromPath];
  const parent = new Map<string, string | null>([[fromPath, null]]);
  const depth = new Map<string, number>([[fromPath, 0]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current) ?? 0;
    if (currentDepth >= hopLimit) continue;

    for (const next of adjacency.get(current) ?? []) {
      if (parent.has(next)) continue;
      parent.set(next, current);
      depth.set(next, currentDepth + 1);
      if (next === toPath) {
        const path: string[] = [];
        let cursor: string | null = next;
        while (cursor) {
          path.push(cursor);
          cursor = parent.get(cursor) ?? null;
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }

  return null;
}

/** Bounded BFS shortest path on the module import graph (from → to via imports). */
export async function shortestModulePath(args: {
  repositoryId: string;
  fromPath: string;
  toPath: string;
  revisionSha?: string;
  hopLimit?: number;
}): Promise<{
  revisionSha: string;
  path: string[] | null;
  nodeIds: string[] | null;
  hops: number;
} | null> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return null;

  const hopLimit = Math.max(1, Math.min(args.hopLimit ?? DEFAULT_PATH_HOP_LIMIT, 32));
  const prisma = getPrisma();
  const edgeRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "fromModule", "toModule"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
    `,
    revision.id
  )) as Array<{ fromModule: string; toModule: string }>;

  const adjacency = new Map<string, string[]>();
  for (const edge of edgeRows) {
    const list = adjacency.get(edge.fromModule) ?? [];
    list.push(edge.toModule);
    adjacency.set(edge.fromModule, list);
  }

  const path = bfsShortestPath(adjacency, args.fromPath, args.toPath, hopLimit);
  if (!path) {
    return {
      revisionSha: revision.revisionSha,
      path: null,
      nodeIds: null,
      hops: -1
    };
  }

  return {
    revisionSha: revision.revisionSha,
    path,
    nodeIds: path.map(fileNodeId),
    hops: path.length - 1
  };
}

export function resolveModulePathArg(raw: string): string {
  return filePathFromNodeId(raw) ?? raw;
}

const DEFAULT_NEIGHBORHOOD_LIMIT = 15;
const DEFAULT_NEIGHBORHOOD_DEPTH = 2;

type RankedNeighbor = {
  path: string;
  depth: number;
  degree: number;
  score: number;
};

/**
 * Progressive disclosure neighborhood: seed + top-ranked nearby modules with
 * induced subgraph edges (not star-to-seed for transitive hops).
 */
export async function getModuleNeighborhood(args: {
  repositoryId: string;
  seedPath?: string;
  revisionSha?: string;
  depth?: number;
  limit?: number;
}): Promise<
  | (ContextGraphSlice & {
      seed: string;
      truncated: boolean;
      ranked: Array<{ path: string; depth: number }>;
    })
  | null
> {
  const revision = await resolveRepositoryRevision({
    repositoryId: args.repositoryId,
    revisionSha: args.revisionSha
  });
  if (!revision) return null;

  const depthLimit = Math.max(1, Math.min(args.depth ?? DEFAULT_NEIGHBORHOOD_DEPTH, 4));
  const limit = Math.max(3, Math.min(args.limit ?? DEFAULT_NEIGHBORHOOD_LIMIT, 40));
  const prisma = getPrisma();

  const edgeRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "fromModule", "toModule", "kind", "confidence", "sourceFile", "sourceLine", "detector"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
    `,
    revision.id
  )) as ModuleEdgeRow[];

  const hotspotRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "filePath", "score"
      FROM "ModuleHotspot"
      WHERE "repositoryId" = $1
    `,
    args.repositoryId
  )) as Array<{ filePath: string; score: number }>;
  const hotspotMap = new Map(hotspotRows.map((row) => [row.filePath, row.score]));

  const degree = new Map<string, number>();
  const outbound = new Map<string, string[]>();
  const inbound = new Map<string, string[]>();
  for (const edge of edgeRows) {
    degree.set(edge.fromModule, (degree.get(edge.fromModule) ?? 0) + 1);
    degree.set(edge.toModule, (degree.get(edge.toModule) ?? 0) + 1);
    const out = outbound.get(edge.fromModule) ?? [];
    out.push(edge.toModule);
    outbound.set(edge.fromModule, out);
    const inn = inbound.get(edge.toModule) ?? [];
    inn.push(edge.fromModule);
    inbound.set(edge.toModule, inn);
  }

  const allPaths = new Set<string>();
  for (const edge of edgeRows) {
    allPaths.add(edge.fromModule);
    allPaths.add(edge.toModule);
  }
  for (const hotspot of hotspotRows) allPaths.add(hotspot.filePath);

  let seed = args.seedPath ? resolveModulePathArg(args.seedPath) : '';
  if (!seed || !allPaths.has(seed)) {
    let best = '';
    let bestScore = -1;
    for (const path of allPaths) {
      const score = (hotspotMap.get(path) ?? 0) + (degree.get(path) ?? 0) * 2;
      if (score > bestScore) {
        bestScore = score;
        best = path;
      }
    }
    seed = best;
  }
  if (!seed) {
    return {
      revisionSha: revision.revisionSha,
      seed: '',
      nodes: [],
      edges: [],
      truncated: false,
      ranked: []
    };
  }

  const depthOf = new Map<string, number>([[seed, 0]]);
  const queue = [seed];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const d = depthOf.get(current) ?? 0;
    if (d >= depthLimit) continue;
    for (const next of [...(outbound.get(current) ?? []), ...(inbound.get(current) ?? [])]) {
      if (depthOf.has(next)) continue;
      depthOf.set(next, d + 1);
      queue.push(next);
    }
  }

  const ranked: RankedNeighbor[] = Array.from(depthOf.entries())
    .filter(([path]) => path !== seed)
    .map(([path, depth]) => ({
      path,
      depth,
      degree: degree.get(path) ?? 0,
      score: hotspotMap.get(path) ?? 0
    }))
    .sort((a, b) => b.score + b.degree * 2 - (a.score + a.degree * 2) || a.depth - b.depth);

  const kept = new Set<string>([seed]);
  for (const row of ranked.slice(0, limit)) kept.add(row.path);
  const truncated = ranked.length > limit;

  const fileRows = (await prisma.$queryRawUnsafe(
    `
      SELECT "path"
      FROM "File"
      WHERE "revisionId" = $1
    `,
    revision.id
  )) as Array<{ path: string }>;
  const knownFiles = new Set(fileRows.map((row) => row.path));

  const nodes = Array.from(kept).map((filePath) => {
    const score = hotspotMap.get(filePath) ?? 0;
    return fileNode({
      filePath,
      knownFiles,
      isHotspot: score > 0,
      score
    });
  });

  const induced = edgeRows.filter((e) => kept.has(e.fromModule) && kept.has(e.toModule));

  return {
    revisionSha: revision.revisionSha,
    seed,
    nodes,
    edges: moduleRowsToContextEdges(induced, revision.revisionSha, knownFiles),
    truncated,
    ranked: ranked.slice(0, limit).map((r) => ({ path: r.path, depth: r.depth })),
    meta: { graphDepth: depthLimit }
  };
}
