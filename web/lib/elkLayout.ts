import ELK from 'elkjs/lib/elk.bundled.js';
import { nodeBoxWidth, type ForceGraphData, type ForceGraphNode } from './architecture';

const NODE_H = 44;

export type GraphLayoutAlgo = 'dagre' | 'elk';

const elk = new ELK();

/** Layered ELK “System View” — better for hierarchical module graphs than LR dagre. */
export async function layoutWithElk(data: ForceGraphData): Promise<ForceGraphData> {
  if (data.nodes.length === 0) {
    return { nodes: [], links: [] };
  }

  const children = data.nodes.map((node) => ({
    id: node.id,
    width: nodeBoxWidth(node.label),
    height: NODE_H
  }));

  const edges = data.links
    .map((link, index) => {
      const source = String(link.source);
      const target = String(link.target);
      if (source === target) return null;
      return {
        id: `e${index}-${source}->${target}`,
        sources: [source],
        targets: [target]
      };
    })
    .filter((edge): edge is { id: string; sources: string[]; targets: string[] } => edge != null);

  const laidOut = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '48',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.padding': '[48,48,48,48]'
    },
    children,
    edges
  });

  const posById = new Map<string, { x: number; y: number }>();
  for (const child of laidOut.children ?? []) {
    if (child.id == null || child.x == null || child.y == null) continue;
    // ELK returns top-left; pin at center for force-graph boxes.
    posById.set(child.id, {
      x: child.x + (child.width ?? nodeBoxWidth(child.id)) / 2,
      y: child.y + (child.height ?? NODE_H) / 2
    });
  }

  const nodes: ForceGraphNode[] = data.nodes.map((node, index) => {
    const pos = posById.get(node.id);
    const x = pos?.x ?? 120 + (index % 4) * 160;
    const y = pos?.y ?? 80 + Math.floor(index / 4) * 64;
    return { ...node, x, y, fx: x, fy: y };
  });

  return { nodes, links: data.links.map((link) => ({ ...link })) };
}
