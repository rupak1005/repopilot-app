import { describe, expect, it } from 'vitest';
import {
  bfsShortestPath,
  keepNeighborhoodWithPathClosure,
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

  it('ranks neighborhood candidates by score and degree (pure)', () => {
    const ranked = [
      { path: 'hub.ts', depth: 1, degree: 10, score: 5 },
      { path: 'leaf.ts', depth: 1, degree: 1, score: 90 },
      { path: 'far.ts', depth: 2, degree: 8, score: 5 }
    ].sort((a, b) => b.score + b.degree * 2 - (a.score + a.degree * 2) || a.depth - b.depth);
    expect(ranked[0]?.path).toBe('leaf.ts');
    expect(ranked[1]?.path).toBe('hub.ts');
  });

  it('keeps BFS ancestors so depth-2 neighbors stay on real multi-hop paths', () => {
    // seed → mid → far (no direct seed→far)
    const parentOf = new Map([
      ['mid.ts', 'seed.ts'],
      ['far.ts', 'mid.ts'],
      ['near.ts', 'seed.ts']
    ]);
    const ranked = [
      { path: 'far.ts', depth: 2, degree: 1, score: 99 },
      { path: 'near.ts', depth: 1, degree: 1, score: 1 }
    ];
    const { kept, truncated } = keepNeighborhoodWithPathClosure({
      seed: 'seed.ts',
      ranked,
      parentOf,
      limit: 1 // only take top-ranked far.ts
    });
    expect(truncated).toBe(true);
    expect(kept.has('seed.ts')).toBe(true);
    expect(kept.has('far.ts')).toBe(true);
    expect(kept.has('mid.ts')).toBe(true); // path closure
    expect(kept.has('near.ts')).toBe(false);

    const edges = [
      { from: 'seed.ts', to: 'mid.ts' },
      { from: 'mid.ts', to: 'far.ts' },
      { from: 'seed.ts', to: 'near.ts' }
    ];
    const induced = edges.filter((e) => kept.has(e.from) && kept.has(e.to));
    expect(induced).toEqual([
      { from: 'seed.ts', to: 'mid.ts' },
      { from: 'mid.ts', to: 'far.ts' }
    ]);
    // Must not invent a star edge seed→far
    expect(induced.some((e) => e.from === 'seed.ts' && e.to === 'far.ts')).toBe(false);
  });
});
