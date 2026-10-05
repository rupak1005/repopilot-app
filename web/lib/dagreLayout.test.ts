import { describe, expect, it } from 'vitest';
import { layoutWithDagre } from './dagreLayout';

describe('layoutWithDagre', () => {
  it('assigns distinct pinned positions', () => {
    const data = layoutWithDagre({
      nodes: [
        { id: 'api/src/server.ts', label: 'server.ts', val: 4, isHotspot: false, score: 0 },
        { id: 'web/pages/index.tsx', label: 'index.tsx', val: 4, isHotspot: false, score: 0 },
        { id: 'web/lib/dashboard.tsx', label: 'dashboard.tsx', val: 4, isHotspot: false, score: 0 }
      ],
      links: [
        { source: 'web/pages/index.tsx', target: 'api/src/server.ts' },
        { source: 'web/lib/dashboard.tsx', target: 'api/src/server.ts' }
      ]
    });

    const positions = new Set(data.nodes.map((n) => `${n.x},${n.y}`));
    expect(positions.size).toBe(3);
    expect(data.nodes.every((n) => n.fx === n.x && n.fy === n.y)).toBe(true);
  });

  it('uses a readable overview grid for sparse indexed graphs', () => {
    const data = layoutWithDagre({
      nodes: Array.from({ length: 12 }, (_, index) => ({
        id: `src/module-${index}.ts`,
        label: `module-${index}.ts`,
        val: 4,
        isHotspot: false,
        score: 0
      })),
      links: []
    });

    const xs = new Set(data.nodes.map((node) => node.x));
    const ys = new Set(data.nodes.map((node) => node.y));
    expect(xs.size).toBeGreaterThan(1);
    expect(ys.size).toBeGreaterThan(1);
    expect(data.nodes.every((node) => node.fx === node.x && node.fy === node.y)).toBe(true);
  });
});
