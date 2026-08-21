import { describe, expect, it } from 'vitest';
import { impactEdgeDashOffset, shouldAnimateImpactEdges } from './vizImpactEdgeMotion';

describe('impactEdgeDashOffset', () => {
  it('returns 0 for invalid time', () => {
    expect(impactEdgeDashOffset(Number.NaN)).toBe(0);
    expect(impactEdgeDashOffset(-1)).toBe(0);
  });

  it('advances negatively so dashes flow source→target', () => {
    expect(impactEdgeDashOffset(0)).toBe(0);
    expect(impactEdgeDashOffset(1)).toBeLessThan(0);
    expect(impactEdgeDashOffset(2)).toBeLessThan(impactEdgeDashOffset(1));
  });
});

describe('shouldAnimateImpactEdges', () => {
  it('is off under reduced motion', () => {
    expect(shouldAnimateImpactEdges(true, 5)).toBe(false);
  });

  it('is on when motion is allowed and edges exist', () => {
    expect(shouldAnimateImpactEdges(false, 3)).toBe(true);
    expect(shouldAnimateImpactEdges(false, 0)).toBe(false);
  });
});
