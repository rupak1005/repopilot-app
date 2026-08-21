import { describe, expect, it } from 'vitest';
import { buildVizLabelBudget, vizLabelBasename, vizLabelCapForBand } from './vizLabelBudget';

describe('vizLabelBudget', () => {
  const ids = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'cluster/x'];
  const score = (id: string) => (id === 'a.ts' ? 90 : id === 'b.ts' ? 50 : 10);
  const isCluster = (id: string) => id.startsWith('cluster');

  it('compact mode keeps only selection and hover', () => {
    const set = buildVizLabelBudget({
      nodeIds: ids,
      hotspotScore: score,
      isCluster,
      selectedId: 'a.ts',
      hoveredId: 'b.ts',
      neighborIds: new Set(['c.ts']),
      band: 'near',
      compact: true
    });
    expect([...set].sort()).toEqual(['a.ts', 'b.ts']);
  });

  it('far band keeps only selection', () => {
    const set = buildVizLabelBudget({
      nodeIds: ids,
      hotspotScore: score,
      isCluster,
      selectedId: 'a.ts',
      hoveredId: null,
      neighborIds: new Set(['c.ts']),
      band: 'far',
      compact: false
    });
    expect([...set]).toEqual(['a.ts']);
  });

  it('medium respects cap and prefers hotspots', () => {
    expect(vizLabelCapForBand('medium')).toBe(10);
    const set = buildVizLabelBudget({
      nodeIds: ids,
      hotspotScore: score,
      isCluster,
      selectedId: null,
      hoveredId: null,
      neighborIds: null,
      band: 'medium',
      compact: false
    });
    expect(set.has('a.ts')).toBe(true);
    expect(set.has('b.ts')).toBe(true);
    expect(set.has('cluster/x')).toBe(true);
    expect(set.has('d.ts')).toBe(false);
  });

  it('truncates long basenames', () => {
    expect(vizLabelBasename('src/very-long-module-name-here.ts', false)).toMatch(/…$/);
    expect(vizLabelBasename('api/', true)).toBe('api/');
  });
});
