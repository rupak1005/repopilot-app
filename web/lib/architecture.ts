export type ArchitectureNode = {
  filePath: string;
  isHotspot: boolean;
  score: number;
};

export type ArchitectureEdge = {
  fromModule: string;
  toModule: string;
  kind?: string;
  confidence?: number;
};

export type ArchitectureGraph = {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
};

export type ForceGraphNode = {
  id: string;
  label: string;
  val: number;
  isHotspot: boolean;
  score: number;
  /** Overview cluster vs leaf file. */
  kind?: 'file' | 'cluster';
  memberCount?: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
};

export type ForceGraphLink = {
  source: string;
  target: string;
  /** Low-confidence / uncertain import (dashed in the canvas). */
  uncertain?: boolean;
};

export type ForceGraphData = {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
};

export type ArchitectureViewMeta = {
  clustered: boolean;
  totalFiles: number;
  visibleFiles: number;
  clusterCount: number;
};

function shortLabel(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 3) return filePath;
  return parts.slice(-3).join('/');
}

/** Canvas box width — keep in sync with ArchitectureGraph paintNode. */
export function nodeBoxWidth(label: string): number {
  return Math.max(88, Math.min(168, label.length * 6.2 + 28));
}

export function nodeCollideRadius(node: ForceGraphNode): number {
  return nodeBoxWidth(node.label) / 2 + 10;
}

export type DiagramLayer = 'all' | 'api' | 'web' | 'common' | 'other';

export function layerOf(filePath: string): Exclude<DiagramLayer, 'all'> {
  if (filePath.startsWith('api/') || filePath === 'cluster:api') return 'api';
  if (filePath.startsWith('web/') || filePath === 'cluster:web') return 'web';
  if (filePath.startsWith('common/') || filePath === 'cluster:common') return 'common';
  return 'other';
}

export const LAYER_META: Record<Exclude<DiagramLayer, 'all'>, { label: string; color: string }> = {
  api: { label: 'API', color: '#34d399' },
  web: { label: 'Web', color: '#60a5fa' },
  common: { label: 'Common', color: '#c084fc' },
  other: { label: 'Other', color: '#a1a1aa' }
};

/** Keep modules (and edges) for one layer before clustering — filter after cluster collapses to a single node. */
export function filterArchitectureGraph(
  graph: ArchitectureGraph,
  layer: DiagramLayer
): ArchitectureGraph {
  if (layer === 'all') return graph;
  const nodes = graph.nodes.filter((n) => layerOf(n.filePath) === layer);
  const keep = new Set(nodes.map((n) => n.filePath));
  const edges = graph.edges.filter((e) => keep.has(e.fromModule) && keep.has(e.toModule));
  return { nodes, edges };
}

export function filterForceGraphData(data: ForceGraphData, layer: DiagramLayer): ForceGraphData {
  if (layer === 'all') return data;
  const nodes = data.nodes.filter((n) => layerOf(n.id) === layer);
  const ids = new Set(nodes.map((n) => n.id));
  const links = data.links.filter((l) => ids.has(String(l.source)) && ids.has(String(l.target)));
  return { nodes, links };
}

export function diagramStats(data: ForceGraphData) {
  return {
    nodes: data.nodes.length,
    edges: data.links.length,
    hotspots: data.nodes.filter((n) => n.isHotspot).length
  };
}

export function clusterIdForPrefix(prefix: string): string {
  return `cluster:${prefix}`;
}

export function parseClusterId(id: string): string | null {
  return id.startsWith('cluster:') ? id.slice('cluster:'.length) : null;
}

/** Top-level folder (or `__root__` for bare filenames). */
export function directoryClusterKey(filePath: string): string {
  const slash = filePath.indexOf('/');
  if (slash <= 0) return '__root__';
  return filePath.slice(0, slash);
}

function degreeMap(edges: ArchitectureEdge[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.fromModule, (degree.get(edge.fromModule) ?? 0) + 1);
    degree.set(edge.toModule, (degree.get(edge.toModule) ?? 0) + 1);
  }
  return degree;
}

function rankScore(node: ArchitectureNode, degree: Map<string, number>): number {
  return node.score + (degree.get(node.filePath) ?? 0) * 2;
}

function toFileForceNode(n: ArchitectureNode, degree: Map<string, number>): ForceGraphNode {
  return {
    id: n.filePath,
    label: shortLabel(n.filePath),
    val: Math.max(2, Math.min(12, 2 + n.score / 15 + (degree.get(n.filePath) ?? 0))),
    isHotspot: n.isHotspot,
    score: n.score,
    kind: 'file'
  };
}

/**
 * Overview: when the graph is large, collapse directories into cluster nodes.
 * Expanded clusters reveal member files (capped) instead of truncating the whole repo.
 */
export function buildArchitectureView(
  graph: ArchitectureGraph,
  opts?: {
    expandedClusters?: Iterable<string>;
    /** Start clustering above this file count. */
    clusterAbove?: number;
    /** Max files shown when a cluster is expanded. */
    maxFilesPerCluster?: number;
  }
): ForceGraphData & { meta: ArchitectureViewMeta } {
  const clusterAbove = opts?.clusterAbove ?? 60;
  const maxFilesPerCluster = opts?.maxFilesPerCluster ?? 40;
  const expanded = new Set(opts?.expandedClusters ?? []);
  const degree = degreeMap(graph.edges);
  const totalFiles = graph.nodes.length;

  if (totalFiles <= clusterAbove) {
    const ranked = [...graph.nodes].sort((a, b) => rankScore(b, degree) - rankScore(a, degree));
    const nodes = ranked.map((n) => toFileForceNode(n, degree));
    const ids = new Set(nodes.map((n) => n.id));
    const links = graph.edges
      .filter((e) => ids.has(e.fromModule) && ids.has(e.toModule))
      .map((e) => ({
        source: e.fromModule,
        target: e.toModule,
        uncertain: (e.confidence ?? 1) < 0.9
      }));
    return {
      nodes,
      links,
      meta: { clustered: false, totalFiles, visibleFiles: nodes.length, clusterCount: 0 }
    };
  }

  const byCluster = new Map<string, ArchitectureNode[]>();
  for (const node of graph.nodes) {
    const key = directoryClusterKey(node.filePath);
    const list = byCluster.get(key) ?? [];
    list.push(node);
    byCluster.set(key, list);
  }

  const nodes: ForceGraphNode[] = [];
  const idOf = new Map<string, string>(); // filePath → visible node id (file or cluster)
  let clusterCount = 0;
  let visibleFiles = 0;

  for (const [prefix, members] of byCluster) {
    const sorted = [...members].sort((a, b) => rankScore(b, degree) - rankScore(a, degree));
    const cid = clusterIdForPrefix(prefix);
    const shouldCluster = sorted.length >= 2 && !expanded.has(cid);

    if (shouldCluster) {
      clusterCount += 1;
      const score = sorted.reduce((sum, n) => sum + n.score, 0) / sorted.length;
      const isHotspot = sorted.some((n) => n.isHotspot);
      nodes.push({
        id: cid,
        label: prefix === '__root__' ? 'root' : `${prefix}/ (${sorted.length})`,
        val: Math.max(4, Math.min(14, 3 + Math.log2(sorted.length + 1) * 2)),
        isHotspot,
        score,
        kind: 'cluster',
        memberCount: sorted.length
      });
      for (const m of sorted) idOf.set(m.filePath, cid);
    } else {
      const shown = expanded.has(cid) ? sorted.slice(0, maxFilesPerCluster) : sorted;
      for (const m of shown) {
        nodes.push(toFileForceNode(m, degree));
        idOf.set(m.filePath, m.filePath);
        visibleFiles += 1;
      }
    }
  }

  const linkKeys = new Set<string>();
  const links: ForceGraphLink[] = [];
  for (const edge of graph.edges) {
    const source = idOf.get(edge.fromModule);
    const target = idOf.get(edge.toModule);
    if (!source || !target || source === target) continue;
    const key = `${source}->${target}`;
    if (linkKeys.has(key)) continue;
    linkKeys.add(key);
    links.push({
      source,
      target,
      uncertain: (edge.confidence ?? 1) < 0.9
    });
  }

  return {
    nodes,
    links,
    meta: { clustered: true, totalFiles, visibleFiles, clusterCount }
  };
}

/** @deprecated Prefer buildArchitectureView — kept for callers that only need a flat ranked slice. */
export function toForceGraphData(graph: ArchitectureGraph, maxNodes = 80): ForceGraphData {
  const degree = degreeMap(graph.edges);
  const ranked = [...graph.nodes].sort((a, b) => rankScore(b, degree) - rankScore(a, degree));
  const kept = new Set(ranked.slice(0, maxNodes).map((n) => n.filePath));
  const nodes: ForceGraphNode[] = ranked
    .filter((n) => kept.has(n.filePath))
    .map((n) => toFileForceNode(n, degree));
  const links: ForceGraphLink[] = graph.edges
    .filter((e) => kept.has(e.fromModule) && kept.has(e.toModule))
    .map((e) => ({ source: e.fromModule, target: e.toModule }));
  return { nodes, links };
}

export function neighborsOf(nodeId: string, links: ForceGraphLink[]): Set<string> {
  const set = new Set<string>([nodeId]);
  for (const link of links) {
    const src = typeof link.source === 'object' ? (link.source as { id: string }).id : link.source;
    const tgt = typeof link.target === 'object' ? (link.target as { id: string }).id : link.target;
    if (src === nodeId) set.add(tgt);
    if (tgt === nodeId) set.add(src);
  }
  return set;
}

/** Merge a neighborhood subgraph into an existing force-graph view. */
export function mergeForceGraphData(base: ForceGraphData, extra: ForceGraphData): ForceGraphData {
  const nodes = new Map(base.nodes.map((n) => [n.id, n]));
  for (const n of extra.nodes) {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  }
  const linkKeys = new Set(
    base.links.map((l) => `${String(l.source)}->${String(l.target)}`)
  );
  const links = [...base.links];
  for (const l of extra.links) {
    const key = `${String(l.source)}->${String(l.target)}`;
    if (linkKeys.has(key)) continue;
    linkKeys.add(key);
    links.push(l);
  }
  return { nodes: Array.from(nodes.values()), links };
}
