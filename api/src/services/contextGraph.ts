import { getPrisma } from '../db/prisma';
import {
  getModuleDependencyTraversal,
  getSymbolDependencyTraversal
} from './dependencyGraphQueries';
import { resolveRepositoryRevision } from './repositoryRevisions';

export type ContextNodeKind = 'file' | 'symbol';
export type ContextEdgeKind = 'imports' | 'calls';
export type ContextProvenance = 'parser';

export type ContextNode = {
  id: string;
  kind: ContextNodeKind;
  label: string;
  filePath?: string;
  symbolType?: string;
  isHotspot?: boolean;
  score?: number;
};

export type ContextEdge = {
  from: string;
  to: string;
  kind: ContextEdgeKind;
  provenance: ContextProvenance;
};

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

function fileLabel(filePath: string): string {
  const parts = filePath.split('/');
  return parts.length <= 2 ? filePath : parts.slice(-2).join('/');
}

export function moduleEdgesToContextEdges(
  edges: Array<{ fromModule: string; toModule: string }>
): ContextEdge[] {
  return edges.map((edge) => ({
    from: edge.fromModule,
    to: edge.toModule,
    kind: 'imports',
    provenance: 'parser'
  }));
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
      SELECT "fromModule", "toModule"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
    `,
    revision.id
  )) as Array<{ fromModule: string; toModule: string }>;

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
    return {
      id: filePath,
      kind: 'file',
      label: fileLabel(filePath),
      filePath,
      isHotspot: score > 0,
      score
    };
  });

  return {
    revisionSha: revision.revisionSha,
    nodes,
    edges: moduleEdgesToContextEdges(edgeRows)
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
      SELECT "toModule"
      FROM "ModuleDependency"
      WHERE "revisionId" = $1
        AND "fromModule" = $2
    `,
    revision.id,
    args.filePath
  )) as Array<{ toModule: string }>;

  const nodes: ContextNode[] = [
    {
      id: args.filePath,
      kind: 'file',
      label: fileLabel(args.filePath),
      filePath: args.filePath
    }
  ];
  const edges: ContextEdge[] = [];

  for (const edge of traversal.directModuleDependents) {
    nodes.push({
      id: edge.fromModule,
      kind: 'file',
      label: fileLabel(edge.fromModule),
      filePath: edge.fromModule
    });
    edges.push({
      from: edge.fromModule,
      to: args.filePath,
      kind: 'imports',
      provenance: 'parser'
    });
  }

  for (const edge of traversal.transitiveModuleDependents) {
    nodes.push({
      id: edge.fromModule,
      kind: 'file',
      label: fileLabel(edge.fromModule),
      filePath: edge.fromModule
    });
    edges.push({
      from: edge.fromModule,
      to: args.filePath,
      kind: 'imports',
      provenance: 'parser'
    });
  }

  for (const row of outboundRows) {
    nodes.push({
      id: row.toModule,
      kind: 'file',
      label: fileLabel(row.toModule),
      filePath: row.toModule
    });
    edges.push({
      from: args.filePath,
      to: row.toModule,
      kind: 'imports',
      provenance: 'parser'
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

  const nodes: ContextNode[] = [
    {
      id: traversal.symbol.symbolId,
      kind: 'symbol',
      label: traversal.symbol.name,
      symbolType: traversal.symbol.type
    }
  ];
  const edges: ContextEdge[] = [];

  for (const caller of [...traversal.directCallers, ...traversal.transitiveCallers]) {
    nodes.push({
      id: caller.symbolId,
      kind: 'symbol',
      label: caller.name,
      symbolType: caller.type
    });
    edges.push({
      from: caller.symbolId,
      to: traversal.symbol.symbolId,
      kind: 'calls',
      provenance: 'parser'
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
