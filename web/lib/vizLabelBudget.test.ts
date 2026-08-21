import { describe, expect, it } from 'vitest';
import {
  buildVizLabelBudget,
  vizLabelBasename,
  vizLabelCapForBand,
  vizLabelMinSeparation
} from './vizLabelBudget';

describe('vizLabelBudget', () => {
  const ids = ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'cluster/x'];
  const score = (id: string) => (id === 'a.ts' ? 90 : id === 'b.ts' ? 50 : 10);
  const isCluster = (id: string) => id.startsWith('cluster');
  const spread = (id: string) => {
    const i = ids.indexOf(id);
    return { x: i * 10, y: 0 };
  };

  it('compact mode keeps only selection and hover', () => {
    const set = buildVizLabelBudget({
      nodeIds: ids,
      hotspotScore: score,
      isCluster,
      position: spread,
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
      position: spread,
      selectedId: 'a.ts',
      hoveredId: null,
      neighborIds: new Set(['c.ts']),
      band: 'far',
      compact: false
    });
    expect([...set]).toEqual(['a.ts']);
  });

  it('medium respects cap and prefers hotspots', () => {
    expect(vizLabelCapForBand('medium')).toBe(5);
    const set = buildVizLabelBudget({
      nodeIds: ids,
      hotspotScore: score,
      isCluster,
      position: spread,
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

  it('drops colliding labels in a tight cluster', () => {
    expect(vizLabelMinSeparation('near')).toBeGreaterThan(1);
    const pile = (id: string) => ({ x: 0.1 * ids.indexOf(id), y: 0 });
    const set = buildVizLabelBudget({
      nodeIds: ids,
      hotspotScore: score,
      isCluster,
      position: pile,
      selectedId: null,
      hoveredId: null,
      neighborIds: null,
      band: 'near',
      compact: false
    });
    // Cluster wins ranking; others collide with it and are skipped.
    expect(set.size).toBe(1);
    expect(set.has('cluster/x')).toBe(true);
  });

  it('always keeps selected even when piled', () => {
    const pile = () => ({ x: 0, y: 0 });
    const set = buildVizLabelBudget({
      nodeIds: ids,
      hotspotScore: score,
      isCluster,
      position: pile,
      selectedId: 'd.ts',
      hoveredId: null,
      neighborIds: null,
      band: 'near',
      compact: false
    });
    expect(set.has('d.ts')).toBe(true);
    expect(set.size).toBeLessThanOrEqual(2);
  });

  it('truncates long basenames', () => {
    expect(vizLabelBasename('src/very-long-module-name-here.ts', false)).toMatch(/…$/);
    expect(vizLabelBasename('api/', true)).toBe('api/');
  });
});
