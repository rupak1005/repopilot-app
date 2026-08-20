import { describe, expect, it } from 'vitest';
import { layoutTopography, topographyClusterKey, topographyRiskTone } from './topography';
import type { HotspotRow } from './types';

function hot(path: string, score: number): HotspotRow {
  return { filePath: path, score, changeCount: score, reasons: [] };
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
});
