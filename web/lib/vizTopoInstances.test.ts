import { describe, expect, it } from 'vitest';
import type { VisualizationNode } from './visualizationModel';
import {
  partitionTopoRenderNodes,
  shouldUseTopoInstancing,
  TOPO_INSTANCE_MIN_NODES,
  topoInstanceTransform
} from './vizTopoInstances';

function fileNode(id: string, score: number, z = 2): VisualizationNode {
  return {
    id,
    entityType: 'file',
    label: id,
    path: id,
    metrics: { hotspotScore: score },
    state: {
      selected: false,
      highlighted: false,
      hidden: false,
      expanded: false
    },
    evidence: [],
    position: { x: 1, y: 2, z }
  };
}

describe('shouldUseTopoInstancing', () => {
  it('requires empty edges and enough nodes', () => {
    expect(shouldUseTopoInstancing(TOPO_INSTANCE_MIN_NODES, 0)).toBe(true);
    expect(shouldUseTopoInstancing(TOPO_INSTANCE_MIN_NODES - 1, 0)).toBe(false);
    expect(shouldUseTopoInstancing(100, 1)).toBe(false);
  });
});

describe('partitionTopoRenderNodes', () => {
  const nodes: VisualizationNode[] = [
    fileNode('a.ts', 10),
    fileNode('hot.ts', 80),
    {
      ...fileNode('cluster:api', 0),
      entityType: 'cluster',
      id: 'cluster:api',
      label: 'API'
    }
  ];

  it('keeps everything interactive at near LOD', () => {
    const { interactive, batched } = partitionTopoRenderNodes(nodes, {
      selectedId: null,
      band: 'near'
    });
    expect(interactive).toHaveLength(3);
    expect(batched).toHaveLength(0);
  });

  it('batches plain files at far LOD', () => {
    const { interactive, batched } = partitionTopoRenderNodes(nodes, {
      selectedId: null,
      band: 'far'
    });
    expect(batched.map((n) => n.id).sort()).toEqual(['a.ts', 'hot.ts']);
    expect(interactive.map((n) => n.id)).toEqual(['cluster:api']);
  });

  it('keeps selection and medium hotspots interactive', () => {
    const { interactive, batched } = partitionTopoRenderNodes(nodes, {
      selectedId: 'a.ts',
      band: 'medium'
    });
    expect(interactive.map((n) => n.id).sort()).toEqual(['a.ts', 'cluster:api', 'hot.ts']);
    expect(batched).toHaveLength(0);
  });
});

describe('topoInstanceTransform', () => {
  it('maps layout XYZ to R3F pose with metric height', () => {
    const t = topoInstanceTransform(fileNode('x.ts', 50, 4));
    expect(t.position).toEqual([1, 2, 2]);
    expect(t.scale[1]).toBeCloseTo(0.2 + 4 * 0.15);
    expect(t.scale[0]).toBeGreaterThan(0);
    expect(t.scale[2]).toBeCloseTo(t.scale[0] * 0.7);
  });
});
