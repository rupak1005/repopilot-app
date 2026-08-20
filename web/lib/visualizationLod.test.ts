import { describe, expect, it } from 'vitest';
import type { ForceGraphData } from './architecture';
import {
  ensureSpikeNodeCount,
  lodBandForDistance,
  sliceForceGraphForSpike
} from './visualizationLod';

describe('lodBandForDistance', () => {
  it('maps camera distance to far / medium / near', () => {
    expect(lodBandForDistance(80)).toBe('far');
    expect(lodBandForDistance(40)).toBe('medium');
    expect(lodBandForDistance(10)).toBe('near');
  });
});

describe('spike fixtures', () => {
  const sample: ForceGraphData = {
    nodes: Array.from({ length: 40 }, (_, i) => ({
      id: `f/${i}.ts`,
      label: `f/${i}.ts`,
      val: 2,
      isHotspot: false,
      score: i,
      kind: 'file' as const
    })),
    links: Array.from({ length: 39 }, (_, i) => ({
      source: `f/${i}.ts`,
      target: `f/${i + 1}.ts`
    }))
  };

  it('slices nodes and incident edges', () => {
    const sliced = sliceForceGraphForSpike(sample, 10);
    expect(sliced.nodes).toHaveLength(10);
    expect(sliced.links.every((l) => typeof l.source === 'string')).toBe(true);
    expect(sliced.links.length).toBeLessThanOrEqual(9);
  });

  it('pads synthetic nodes up to a target count', () => {
    const padded = ensureSpikeNodeCount(sample, 55);
    expect(padded.nodes).toHaveLength(55);
    expect(padded.nodes.some((n) => n.id.startsWith('synth/'))).toBe(true);
  });
});
