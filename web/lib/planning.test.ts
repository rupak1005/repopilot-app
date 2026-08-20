import { describe, expect, it } from 'vitest';
import {
  planningCandidatesFromHotspots,
  planningReason,
  planningSeedFromQuery
} from './planning';
import type { HotspotRow } from './types';

const ROWS: HotspotRow[] = [
  { filePath: 'api/src/a.ts', score: 0.9, changeCount: 12, reasons: [] },
  { filePath: 'web/lib/b.ts', score: 0.4, changeCount: 6, reasons: [] },
  { filePath: 'common/c.ts', score: 0.2, changeCount: 1, reasons: [] }
];

describe('planning', () => {
  it('orders candidates by score then churn', () => {
    const candidates = planningCandidatesFromHotspots(ROWS, 2);
    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.filePath).toBe('api/src/a.ts');
    expect(candidates[0]?.reason.toLowerCase()).toContain('blast');
  });

  it('parses optional file seed', () => {
    expect(planningSeedFromQuery('src/x.ts')).toBe('src/x.ts');
    expect(planningSeedFromQuery('')).toBeNull();
  });

  it('explains mid-tier hotspots', () => {
    expect(planningReason({ filePath: 'x.ts', score: 0.55, changeCount: 2, reasons: [] }).toLowerCase()).toContain(
      'impact'
    );
  });
});
