import { describe, expect, it } from 'vitest';
import {
  buildArchitectureView,
  clusterIdForPrefix,
  directoryClusterKey,
  filterArchitectureGraph,
  filterForceGraphData,
  mergeForceGraphData,
  parseClusterId,
  toForceGraphData,
  type ArchitectureGraph
} from './architecture';

function bigGraph(n: number): ArchitectureGraph {
  const nodes = Array.from({ length: n }, (_, i) => {
    const bucket = i % 3 === 0 ? 'api' : i % 3 === 1 ? 'web' : 'common';
    return {
      filePath: `${bucket}/f${i}.ts`,
      isHotspot: i % 11 === 0,
      score: n - i
    };
  });
  const edges = nodes.slice(1).map((node, i) => ({
    fromModule: nodes[i]!.filePath,
    toModule: node.filePath
  }));
  return { nodes, edges };
}

describe('toForceGraphData', () => {
  it('maps modules to force-graph nodes and links', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        { filePath: 'a.ts', isHotspot: true, score: 90 },
        { filePath: 'b.ts', isHotspot: false, score: 10 }
      ],
      edges: [{ fromModule: 'a.ts', toModule: 'b.ts' }]
    };
    const fg = toForceGraphData(graph);
    expect(fg.nodes).toHaveLength(2);
    expect(fg.links).toHaveLength(1);
    expect(fg.nodes[0]?.id).toBe('a.ts');
  });
});

describe('buildArchitectureView', () => {
  it('keeps files flat under the cluster threshold', () => {
    const view = buildArchitectureView(bigGraph(10), { clusterAbove: 60 });
    expect(view.meta.clustered).toBe(false);
    expect(view.nodes).toHaveLength(10);
    expect(view.nodes.every((n) => n.kind === 'file')).toBe(true);
  });

  it('clusters by top-level directory above threshold', () => {
    const view = buildArchitectureView(bigGraph(90), { clusterAbove: 60 });
    expect(view.meta.clustered).toBe(true);
    expect(view.meta.clusterCount).toBeGreaterThan(0);
    expect(view.nodes.some((n) => n.kind === 'cluster')).toBe(true);
    expect(view.nodes.length).toBeLessThan(90);
  });

  it('expands a cluster into member files', () => {
    const cid = clusterIdForPrefix('api');
    const view = buildArchitectureView(bigGraph(90), {
      clusterAbove: 60,
      expandedClusters: [cid]
    });
    expect(view.nodes.some((n) => n.id === cid)).toBe(false);
    expect(view.nodes.some((n) => n.id.startsWith('api/'))).toBe(true);
  });

  it('parses cluster ids', () => {
    expect(directoryClusterKey('api/src/x.ts')).toBe('api');
    expect(parseClusterId(clusterIdForPrefix('web'))).toBe('web');
  });
});

describe('mergeForceGraphData', () => {
  it('merges neighborhood nodes without duplicating links', () => {
    const base = {
      nodes: [{ id: 'a.ts', label: 'a', val: 2, isHotspot: false, score: 0 }],
      links: [{ source: 'a.ts', target: 'b.ts' }]
    };
    const extra = {
      nodes: [
        { id: 'b.ts', label: 'b', val: 2, isHotspot: false, score: 0 },
        { id: 'c.ts', label: 'c', val: 2, isHotspot: false, score: 0 }
      ],
      links: [
        { source: 'a.ts', target: 'b.ts' },
        { source: 'b.ts', target: 'c.ts' }
      ]
    };
    const merged = mergeForceGraphData(base, extra);
    expect(merged.nodes).toHaveLength(3);
    expect(merged.links).toHaveLength(2);
  });
});

describe('filterForceGraphData', () => {
  it('filters by api layer', () => {
    const data = {
      nodes: [
        { id: 'api/src/a.ts', label: 'a', val: 4, isHotspot: false, score: 0 },
        { id: 'web/b.tsx', label: 'b', val: 4, isHotspot: false, score: 0 }
      ],
      links: [{ source: 'api/src/a.ts', target: 'web/b.tsx' }]
    };
    const filtered = filterForceGraphData(data, 'api');
    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.links).toHaveLength(0);
  });
});

describe('filterArchitectureGraph', () => {
  it('scopes modules before clustering so a layer is not a lone cluster node', () => {
    const scoped = filterArchitectureGraph(bigGraph(90), 'common');
    expect(scoped.nodes.every((n) => n.filePath.startsWith('common/'))).toBe(true);
    expect(scoped.edges.every((e) => e.fromModule.startsWith('common/') && e.toModule.startsWith('common/'))).toBe(
      true
    );
    const view = buildArchitectureView(scoped, {
      clusterAbove: 60,
      expandedClusters: [clusterIdForPrefix('common')],
      maxFilesPerCluster: 80
    });
    expect(view.nodes.some((n) => n.kind === 'cluster')).toBe(false);
    expect(view.nodes.length).toBeGreaterThan(1);
    expect(view.nodes.every((n) => n.id.startsWith('common/'))).toBe(true);
  });
});
