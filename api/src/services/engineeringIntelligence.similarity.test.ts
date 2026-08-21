import { describe, expect, it } from 'vitest';
import { pathSetSimilarity } from './engineeringIntelligence';

describe('pathSetSimilarity', () => {
  it('returns 1 for identical sets', () => {
    expect(pathSetSimilarity(['a.ts', 'b.ts'], ['b.ts', 'a.ts'])).toBe(1);
  });

  it('returns 0 for disjoint sets', () => {
    expect(pathSetSimilarity(['a.ts'], ['b.ts'])).toBe(0);
  });

  it('scores partial overlap as Jaccard', () => {
    // inter=1, union=3 → 1/3
    expect(pathSetSimilarity(['a.ts', 'b.ts'], ['a.ts', 'c.ts'])).toBeCloseTo(1 / 3);
  });
});
