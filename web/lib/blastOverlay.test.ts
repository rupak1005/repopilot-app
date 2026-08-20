import { describe, expect, it } from 'vitest';
import { blastFromImpactPayload, blastHighlightSet, blastRole } from './blastOverlay';

describe('blastOverlay', () => {
  it('classifies seed / direct / transitive roles', () => {
    const blast = blastFromImpactPayload({
      target: { filePath: 'a.ts' },
      directDependents: ['b.ts'],
      transitiveDependents: ['c.ts']
    });
    expect(blastRole('a.ts', blast)).toBe('seed');
    expect(blastRole('b.ts', blast)).toBe('direct');
    expect(blastRole('c.ts', blast)).toBe('transitive');
    expect(blastRole('z.ts', blast)).toBeNull();
    expect(blastHighlightSet(blast).size).toBe(3);
  });
});
