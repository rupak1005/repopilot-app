import { describe, expect, it } from 'vitest';
import { toForceGraphData, filterForceGraphData, type ArchitectureGraph } from './architecture';

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
