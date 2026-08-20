import { describe, expect, it } from 'vitest';
import { parseHotspotWindowDays } from './engineeringIntelligence';

describe('parseHotspotWindowDays', () => {
  it('accepts supported windows and defaults to 30', () => {
    expect(parseHotspotWindowDays(7)).toBe(7);
    expect(parseHotspotWindowDays('90')).toBe(90);
    expect(parseHotspotWindowDays(365)).toBe(365);
    expect(parseHotspotWindowDays(30)).toBe(30);
    expect(parseHotspotWindowDays(undefined)).toBe(30);
    expect(parseHotspotWindowDays('nope')).toBe(30);
    expect(parseHotspotWindowDays(14)).toBe(30);
  });
});
