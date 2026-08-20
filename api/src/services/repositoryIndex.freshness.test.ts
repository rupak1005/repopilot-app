import { describe, expect, it } from 'vitest';
import { isIndexBehindRemote } from './repositoryIndex';

describe('isIndexBehindRemote', () => {
  it('is stale only when ready and SHAs differ', () => {
    expect(isIndexBehindRemote('ready', 'aaa', 'bbb')).toBe(true);
    expect(isIndexBehindRemote('ready', 'aaa', 'aaa')).toBe(false);
    expect(isIndexBehindRemote('indexing', 'aaa', 'bbb')).toBe(false);
    expect(isIndexBehindRemote('ready', null, 'bbb')).toBe(false);
    expect(isIndexBehindRemote('ready', 'aaa', null)).toBe(false);
  });
});
