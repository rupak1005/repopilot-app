import { describe, expect, it } from 'vitest';
import { diagramFitPadding, nodeBoxWidth, nodeCollideRadius } from './architecture';

describe('diagramFitPadding', () => {
  it('shrinks padding on phone-sized canvases', () => {
    expect(diagramFitPadding(360, 520)).toBeLessThan(40);
    expect(diagramFitPadding(360, 520)).toBeGreaterThanOrEqual(16);
    expect(diagramFitPadding(900, 600)).toBe(80);
  });
});

describe('nodeCollideRadius', () => {
  it('scales with label width for forceCollide', () => {
    const short = nodeCollideRadius({
      id: 'a',
      label: 'x.ts',
      val: 4,
      isHotspot: false,
      score: 0
    });
    const long = nodeCollideRadius({
      id: 'b',
      label: 'services/repositoryIndex.ts',
      val: 4,
      isHotspot: false,
      score: 0
    });
    expect(long).toBeGreaterThan(short);
    expect(short).toBeGreaterThan(40);
  });

  it('nodeBoxWidth caps extremely long labels', () => {
    expect(nodeBoxWidth('a'.repeat(80))).toBeLessThanOrEqual(168);
  });
});
