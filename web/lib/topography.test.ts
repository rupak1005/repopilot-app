import { describe, expect, it } from 'vitest';
import {
  hotspotMetricValue,
  layoutTopography,
  parseTopoWindowDays,
  scaleHotspotsForWindow,
  topographyClusterKey,
  topographyRiskTone
} from './topography';
import type { HotspotRow } from './types';

function hot(
  path: string,
  score: number,
  extras?: Partial<HotspotRow>
): HotspotRow {
  return {
    filePath: path,
    score,
    changeCount: extras?.changeCount ?? score,
    dependentCount: extras?.dependentCount,
    findingsCount: extras?.findingsCount,
    reasons: []
  };
}

describe('layoutTopography', () => {
  it('clusters by top-level directory and sizes by score', () => {
    const cells = layoutTopography(
      [
        hot('api/a.ts', 80),
        hot('api/b.ts', 20),
        hot('web/c.tsx', 40),
        hot('common/d.ts', 10)
      ],
      { columns: 3 }
    );
    expect(cells).toHaveLength(3);
    expect(topographyClusterKey('api/src/x.ts')).toBe('api');
    expect(cells[0]?.label).toBe('api');
    expect(cells[0]?.memberCount).toBe(2);
    expect(cells[0]?.weight).toBe(4);
    expect(topographyRiskTone(50)).toBe('high');
  });

  it('can size clusters by dependents metric', () => {
    const cells = layoutTopography(
      [
        hot('api/a.ts', 10, { dependentCount: 50 }),
        hot('web/b.tsx', 90, { dependentCount: 2 })
      ],
      { metric: 'dependentCount' }
    );
    expect(hotspotMetricValue(cells[0]!.files[0]!, 'dependentCount')).toBe(50);
    expect(cells[0]?.label).toBe('api');
    expect(cells[0]?.value).toBe(50);
  });
});

describe('topo windows', () => {
  it('parses supported lookbacks', () => {
    expect(parseTopoWindowDays(7)).toBe(7);
    expect(parseTopoWindowDays('365')).toBe(365);
    expect(parseTopoWindowDays('x')).toBe(30);
  });

  it('scales demo hotspots with the lookback', () => {
    const scaled = scaleHotspotsForWindow([hot('a.ts', 30, { changeCount: 30 })], 90);
    expect(scaled[0]?.changeCount).toBe(90);
    expect(scaled[0]?.score).toBe(90);
  });
});
