import type { LodBand } from './visualizationLod';
import { mapMetricToSize, type VisualizationNode } from './visualizationModel';

/** Below this node count, individual meshes are cheaper than instance setup. */
export const TOPO_INSTANCE_MIN_NODES = 24;

/** Topography graphs ship with no edges — use that + density to enable batching. */
export function shouldUseTopoInstancing(nodeCount: number, edgeCount: number): boolean {
  return edgeCount === 0 && nodeCount >= TOPO_INSTANCE_MIN_NODES;
}

/**
 * Near LOD keeps full interactive meshes (labels).
 * Far/medium: batch plain file pillars; keep clusters, selection, and hotspot labels interactive.
 */
export function partitionTopoRenderNodes(
  nodes: VisualizationNode[],
  opts: { selectedId: string | null; band: LodBand }
): { interactive: VisualizationNode[]; batched: VisualizationNode[] } {
  if (opts.band === 'near') {
    return { interactive: [...nodes], batched: [] };
  }

  const interactive: VisualizationNode[] = [];
  const batched: VisualizationNode[] = [];
  for (const node of nodes) {
    const keepInteractive =
      node.entityType === 'cluster' ||
      node.id === opts.selectedId ||
      (opts.band === 'medium' && (node.metrics.hotspotScore ?? 0) >= 40);
    if (keepInteractive) interactive.push(node);
    else batched.push(node);
  }
  return { interactive, batched };
}

/** World pose matching GraphNodeMesh box pillars (unit box × scale). */
export function topoInstanceTransform(node: VisualizationNode): {
  position: [number, number, number];
  scale: [number, number, number];
} {
  const pos = node.position ?? { x: 0, y: 0, z: 0 };
  const size =
    node.entityType === 'cluster'
      ? 0.85
      : mapMetricToSize(node.metrics.hotspotScore ?? 10, 100, { min: 0.28, maxSize: 0.7 });
  const height = 0.2 + (pos.z || 0) * 0.15;
  return {
    position: [pos.x, pos.z * 0.5, pos.y],
    scale: [size, height, size * 0.7]
  };
}
