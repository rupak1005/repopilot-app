import { describe, expect, it } from 'vitest';
import { formatLatency, hotspotScoreClass } from './metrics';

describe('formatLatency', () => {
  it('returns n/a for null', () => {
    expect(formatLatency(null)).toBe('n/a');
  });

  it('formats sub-second values in ms', () => {
    expect(formatLatency(450)).toBe('450ms');
  });

  it('formats seconds with one decimal', () => {
    expect(formatLatency(1500)).toBe('1.5s');
  });
});

describe('hotspotScoreClass', () => {
  it('maps score tiers to css variables', () => {
    expect(hotspotScoreClass(90)).toBe('var(--status-fail)');
    expect(hotspotScoreClass(60)).toBe('var(--status-warn)');
    expect(hotspotScoreClass(20)).toBe('var(--primary)');
  });
});
