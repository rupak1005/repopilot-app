import { describe, expect, it } from 'vitest';
import {
  bfsShortestPath,
  moduleEdgesToContextEdges,
  parseContextGraphView,
  resolveModulePathArg
} from './contextGraph';

describe('contextGraph', () => {
  it('maps module dependency rows to URN edges with parser provenance', () => {
    const edges = moduleEdgesToContextEdges(
      [{ fromModule: 'api/src/server.ts', toModule: 'api/src/db/prisma.ts' }],
      'abc123'
    );
    expect(edges).toEqual([
      {
        from: 'file:api/src/server.ts',
        to: 'file:api/src/db/prisma.ts',
        kind: 'imports',
        provenance: {
          detector: 'parser',
          confidence: 1,
          sourceFile: 'api/src/server.ts',
          revisionSha: 'abc123'
        }
      }
    ]);
  });

  it('parseContextGraphView defaults to architecture', () => {
    expect(parseContextGraphView(undefined)).toBe('architecture');
    expect(parseContextGraphView('neighbors')).toBe('neighbors');
  });

  it('resolveModulePathArg unwraps file URNs', () => {
    expect(resolveModulePathArg('file:web/lib/foo.ts')).toBe('web/lib/foo.ts');
    expect(resolveModulePathArg('web/lib/foo.ts')).toBe('web/lib/foo.ts');
  });

  it('bfsShortestPath finds a bounded import path', () => {
    const adjacency = new Map([
      ['a.ts', ['b.ts', 'x.ts']],
      ['b.ts', ['c.ts']]
    ]);
    expect(bfsShortestPath(adjacency, 'a.ts', 'c.ts')).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(bfsShortestPath(adjacency, 'a.ts', 'c.ts', 1)).toBeNull();
  });
});
