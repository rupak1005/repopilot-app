import dagre from 'dagre';
import { nodeBoxWidth, type ForceGraphData, type ForceGraphNode } from './architecture';

const NODE_H = 44;

const LARGE_GRAPH_LAYOUT_THRESHOLD = 180;

function layoutSparse(data: ForceGraphData): ForceGraphData {
  const ordered = [...data.nodes].sort((a, b) => {
    const kind = Number(b.kind === 'cluster') - Number(a.kind === 'cluster');
    return kind || a.id.localeCompare(b.id);
  });
  const columns = Math.max(1, Math.ceil(Math.sqrt(ordered.length * 1.35)));
  const nodes = ordered.map((node, index) => {
    const x = 150 + (index % columns) * 220;
    const y = 100 + Math.floor(index / columns) * 104;
    return { ...node, x, y, fx: x, fy: y };
  });
  return { nodes, links: data.links.map((link) => ({ ...link })) };
}

function layoutLargeGraph(data: ForceGraphData): ForceGraphData {
  const columns = Math.max(1, Math.ceil(Math.sqrt(data.nodes.length)));
  const nodes = data.nodes.map((node, index) => {
    const x = 120 + (index % columns) * 190;
    const y = 80 + Math.floor(index / columns) * 92;
    return { ...node, x, y, fx: x, fy: y };
  });
  return { nodes, links: data.links.map((link) => ({ ...link })) };
}

export function layoutWithDagre(data: ForceGraphData): ForceGraphData {
  if (data.nodes.length === 0) {
    return { nodes: [], links: [] };
  }

  // Dagre's longest-path ranker becomes superlinear on wide repository graphs.
  // Keep the interactive spike bounded with a deterministic fallback for large
  // views; smaller graphs retain the higher-fidelity dependency layout.
  if (data.nodes.length > LARGE_GRAPH_LAYOUT_THRESHOLD) {
    return layoutLargeGraph(data);
  }

  // A repository can have useful indexed files before dependency extraction
  // finishes. Dagre puts a sparse graph into one tall rank, which makes the
  // canvas look empty and makes every label unreadable. Use a stable overview
  // grid until there is enough edge evidence to justify a flow layout.
  if (data.nodes.length >= 8 && data.links.length < Math.max(2, data.nodes.length * 0.1)) {
    return layoutSparse(data);
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
