import { describe, expect, it } from 'vitest';
import { indexJobLooksAbandoned, isIndexBehindRemote } from './repositoryIndex';

describe('isIndexBehindRemote', () => {
  it('is stale only when ready and SHAs differ', () => {
    expect(isIndexBehindRemote('ready', 'aaa', 'bbb')).toBe(true);
    expect(isIndexBehindRemote('ready', 'aaa', 'aaa')).toBe(false);
    expect(isIndexBehindRemote('indexing', 'aaa', 'bbb')).toBe(false);
    expect(isIndexBehindRemote('ready', null, 'bbb')).toBe(false);
    expect(isIndexBehindRemote('ready', 'aaa', null)).toBe(false);
  });
});

describe('indexJobLooksAbandoned', () => {
  it('flags RUNNING jobs past the stale window', () => {
    const now = Date.parse('2026-08-20T20:00:00.000Z');
    expect(indexJobLooksAbandoned('2026-08-20T19:30:00.000Z', now, 20 * 60 * 1000)).toBe(true);
    expect(indexJobLooksAbandoned('2026-08-20T19:50:00.000Z', now, 20 * 60 * 1000)).toBe(false);
  });
});
