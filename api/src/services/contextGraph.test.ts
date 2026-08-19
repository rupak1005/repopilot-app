import { describe, expect, it } from 'vitest';
import { moduleEdgesToContextEdges, parseContextGraphView } from './contextGraph';

describe('contextGraph', () => {
  it('maps module dependency rows to context edges with parser provenance', () => {
    const edges = moduleEdgesToContextEdges([
      { fromModule: 'api/src/server.ts', toModule: 'api/src/db/prisma.ts' }
    ]);
    expect(edges).toEqual([
      {
        from: 'api/src/server.ts',
        to: 'api/src/db/prisma.ts',
        kind: 'imports',
        provenance: 'parser'
      }
    ]);
  });

  it('parseContextGraphView defaults to architecture', () => {
    expect(parseContextGraphView(undefined)).toBe('architecture');
    expect(parseContextGraphView('neighbors')).toBe('neighbors');
  });
});
