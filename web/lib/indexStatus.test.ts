import { describe, expect, it } from 'vitest';
import { indexStatusLabel } from './indexStatus';

describe('indexStatusLabel', () => {
  it('maps index states to topbar labels', () => {
    expect(indexStatusLabel(null)).toBe('Indexing');
    expect(indexStatusLabel({ state: 'indexing', revisionSha: null, fileCount: 0, symbolCount: 0, job: null })).toBe(
      'Indexing…'
    );
    expect(
      indexStatusLabel({
        state: 'ready',
        revisionSha: 'abc1234567890',
        fileCount: 10,
        symbolCount: 5,
        job: null
      })
    ).toBe('Indexed abc1234');
    expect(indexStatusLabel({ state: 'failed', revisionSha: null, fileCount: 0, symbolCount: 0, job: null })).toBe(
      'Index failed'
    );
  });
});
