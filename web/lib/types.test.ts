import { describe, expect, it } from 'vitest';
import { outcomeIcon, parseRepoSlug } from './types';

describe('parseRepoSlug', () => {
  it('splits owner and name', () => {
    expect(parseRepoSlug('acme/widget')).toEqual({ owner: 'acme', name: 'widget' });
  });

  it('handles bare repo name', () => {
    expect(parseRepoSlug('widget')).toEqual({ owner: 'widget', name: 'widget' });
  });
});

describe('outcomeIcon', () => {
  it('maps review outcomes to symbols', () => {
    expect(outcomeIcon('PASS')).toBe('✓');
    expect(outcomeIcon('WARN')).toBe('⚠');
    expect(outcomeIcon('FAIL')).toBe('✕');
    expect(outcomeIcon(null)).toBe('…');
  });
});
