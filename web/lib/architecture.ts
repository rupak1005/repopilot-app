export type ArchitectureNode = {
  filePath: string;
  isHotspot: boolean;
  score: number;
};

export type ArchitectureEdge = {
  fromModule: string;
  toModule: string;
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
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
};

export type ForceGraphLink = {
  source: string;
  target: string;
};

export type ForceGraphData = {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
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

/** Collision radius for d3-force forceCollide (Context7 / react-force-graph pattern). */
export function nodeCollideRadius(node: ForceGraphNode): number {
  return nodeBoxWidth(node.label) / 2 + 10;
}

export type DiagramLayer = 'all' | 'api' | 'web' | 'common' | 'other';

export function layerOf(filePath: string): Exclude<DiagramLayer, 'all'> {
  if (filePath.startsWith('api/')) return 'api';
  if (filePath.startsWith('web/')) return 'web';
  if (filePath.startsWith('common/')) return 'common';
  return 'other';
}

export const LAYER_META: Record<Exclude<DiagramLayer, 'all'>, { label: string; color: string }> = {
  api: { label: 'API', color: '#34d399' },
  web: { label: 'Web', color: '#60a5fa' },
  common: { label: 'Common', color: '#c084fc' },
  other: { label: 'Other', color: '#a1a1aa' }
};

export function filterForceGraphData(data: ForceGraphData, layer: DiagramLayer): ForceGraphData {
  if (layer === 'all') return data;
  const nodes = data.nodes.filter((n) => layerOf(n.id) === layer);
  const ids = new Set(nodes.map((n) => n.id));
  const links = data.links.filter((l) => ids.has(String(l.source)) && ids.has(String(l.target)));
  return { nodes, links };
}

export function diagramStats(data: ForceGraphData) {
  return { nodes: data.nodes.length, edges: data.links.length, hotspots: data.nodes.filter((n) => n.isHotspot).length };
}

/** ponytail: cap at 80 nodes — upgrade path: cluster by folder or paginate */
export function toForceGraphData(
  graph: ArchitectureGraph,
  maxNodes = 80
): ForceGraphData {
  const degree = new Map<string, number>();
  for (const edge of graph.edges) {
    degree.set(edge.fromModule, (degree.get(edge.fromModule) ?? 0) + 1);
    degree.set(edge.toModule, (degree.get(edge.toModule) ?? 0) + 1);
  }

  const ranked = [...graph.nodes].sort((a, b) => {
    const scoreA = a.score + (degree.get(a.filePath) ?? 0) * 2;
    const scoreB = b.score + (degree.get(b.filePath) ?? 0) * 2;
    return scoreB - scoreA;
  });

  const kept = new Set(ranked.slice(0, maxNodes).map((n) => n.filePath));
  const nodes: ForceGraphNode[] = ranked
    .filter((n) => kept.has(n.filePath))
    .map((n) => ({
      id: n.filePath,
      label: shortLabel(n.filePath),
      val: Math.max(2, Math.min(12, 2 + n.score / 15 + (degree.get(n.filePath) ?? 0))),
      isHotspot: n.isHotspot,
      score: n.score
    }));

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
