import dagre from 'dagre';
import { nodeBoxWidth, type ForceGraphData, type ForceGraphNode } from './architecture';

const NODE_H = 44;

/** Context7 force-graph dagre example: pre-layout, pin nodes, cooldownTicks 0. */
export function layoutWithDagre(data: ForceGraphData): ForceGraphData {
  if (data.nodes.length === 0) {
    return { nodes: [], links: [] };
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    ranker: 'longest-path',
    nodesep: 48,
    ranksep: 120,
    marginx: 48,
    marginy: 48
  });

  for (const node of data.nodes) {
    g.setNode(node.id, {
      width: nodeBoxWidth(node.label),
      height: NODE_H
    });
  }

  for (const link of data.links) {
    const source = String(link.source);
    const target = String(link.target);
    if (g.hasNode(source) && g.hasNode(target) && source !== target) {
      g.setEdge(source, target);
    }
  }

  dagre.layout(g);

  const nodes: ForceGraphNode[] = data.nodes.map((node, index) => {
    const pos = g.node(node.id) as { x: number; y: number } | undefined;
    const x = pos?.x ?? 120 + (index % 4) * 160;
    const y = pos?.y ?? 80 + Math.floor(index / 4) * 64;
    return { ...node, x, y, fx: x, fy: y };
  });

  return { nodes, links: data.links.map((link) => ({ ...link })) };
}
