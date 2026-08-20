import type { ForceGraphData } from './architecture';

/** Camera-distance LOD bands for the 3D viz spike (shared with tests, no Three.js). */
export type LodBand = 'far' | 'medium' | 'near';

export function lodBandForDistance(distance: number): LodBand {
  if (distance > 55) return 'far';
  if (distance > 28) return 'medium';
  return 'near';
}

function endpointId(raw: unknown): string {
  if (typeof raw === 'object' && raw && 'id' in raw) {
    return String((raw as { id: string }).id);
  }
  return String(raw);
}

/** Slice a laid-out force graph for small / medium / large spike fixtures. */
export function sliceForceGraphForSpike(data: ForceGraphData, maxNodes: number): ForceGraphData {
  if (data.nodes.length <= maxNodes) return data;
  const nodes = data.nodes.slice(0, maxNodes);
  const keep = new Set(nodes.map((n) => n.id));
  const links = data.links.filter(
    (link) => keep.has(endpointId(link.source)) && keep.has(endpointId(link.target))
  );
  return { nodes, links };
}

/**
 * Pad with synthetic modules when the live graph is too small for a large-repo stress check.
 * Positions are left unset so dagre/ELK can place them.
 */
export function ensureSpikeNodeCount(data: ForceGraphData, target: number): ForceGraphData {
  if (data.nodes.length >= target) return sliceForceGraphForSpike(data, target);
  const nodes = [...data.nodes];
  const links = [...data.links];
  let i = 0;
  while (nodes.length < target) {
    const id = `synth/mod-${i}.ts`;
    nodes.push({
      id,
      label: `synth/mod-${i}.ts`,
      val: 2,
      isHotspot: i % 17 === 0,
      score: (i * 13) % 100,
      kind: 'file'
    });
    if (nodes.length >= 2) {
      const prev = nodes[nodes.length - 2]!.id;
      links.push({ source: prev, target: id });
    }
    i += 1;
  }
  return { nodes, links };
}

export const SPIKE_SIZE_LIMITS = {
  small: 15,
  medium: 60,
  large: 250
} as const;

export type SpikeSizePreset = keyof typeof SPIKE_SIZE_LIMITS | 'live';
