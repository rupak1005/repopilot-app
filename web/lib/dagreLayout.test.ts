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
});
