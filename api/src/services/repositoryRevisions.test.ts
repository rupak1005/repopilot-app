import { describe, expect, it } from 'vitest';
import { normalizeRevisionShaQuery } from './repositoryRevisions';

describe('normalizeRevisionShaQuery', () => {
  it('trims and lowercases', () => {
    expect(normalizeRevisionShaQuery('  ABCDEF1  ')).toBe('abcdef1');
  });

  it('treats empty as null', () => {
    expect(normalizeRevisionShaQuery('')).toBeNull();
    expect(normalizeRevisionShaQuery('   ')).toBeNull();
    expect(normalizeRevisionShaQuery(null)).toBeNull();
    expect(normalizeRevisionShaQuery(undefined)).toBeNull();
  });
});
