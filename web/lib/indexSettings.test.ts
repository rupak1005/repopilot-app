import { describe, expect, it } from 'vitest';
import { canRequestReindex, indexStateLabel } from './indexSettings';
import type { RepositoryIndexStatus } from './indexStatus';

const ready: RepositoryIndexStatus = {
  state: 'ready',
  stage: 'ready',
  revisionSha: 'abc1234',
  fileCount: 10,
  symbolCount: 20,
  job: null
};

describe('indexSettings', () => {
  it('labels index states for settings', () => {
    expect(indexStateLabel('ready')).toBe('Ready');
    expect(indexStateLabel('indexing')).toBe('Indexing');
    expect(indexStateLabel(undefined)).toBe('Unknown');
  });

  it('blocks re-index while a job is running', () => {
    expect(canRequestReindex(ready, false)).toBe(true);
    expect(canRequestReindex(ready, true)).toBe(false);
    expect(
      canRequestReindex({ ...ready, state: 'indexing', stage: 'parse' }, false)
    ).toBe(false);
  });
});
