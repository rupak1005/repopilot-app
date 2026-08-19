import { describe, expect, it } from 'vitest';
import { mermaidNodeId, toMermaidFlowchart } from './mermaidDiagram';

describe('mermaidDiagram', () => {
  it('builds id map for rendered nodes', () => {
    const chart = toMermaidFlowchart({
      nodes: [{ id: 'api/src/server.ts', label: 'server.ts', val: 4, isHotspot: false, score: 0 }],
      links: []
    });
    expect(chart.idMap[mermaidNodeId('api/src/server.ts')]).toBe('api/src/server.ts');
  });
});
