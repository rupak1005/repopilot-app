import { describe, expect, it } from 'vitest';
import { formatIndexedAt, shortSha } from './history';

describe('history helpers', () => {
  it('shortens SHAs', () => {
    expect(shortSha('abcdef1234567890')).toBe('abcdef1');
  });

  it('formats indexed timestamps', () => {
    const label = formatIndexedAt('2026-08-20T12:00:00.000Z');
    expect(label.length).toBeGreaterThan(4);
  });
});
