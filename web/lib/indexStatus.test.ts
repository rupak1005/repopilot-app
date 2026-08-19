import { describe, expect, it } from 'vitest';
import { indexStatusLabel, parseIndexStreamPayload } from './indexStatus';

describe('parseIndexStreamPayload', () => {
  it('parses SSE data payloads', () => {
    const payload = {
      state: 'indexing',
      stage: 'parse',
      revisionSha: null,
      fileCount: 3,
      symbolCount: 0,
      job: null
    };
    expect(parseIndexStreamPayload(JSON.stringify(payload))).toEqual(payload);
    expect(parseIndexStreamPayload('not-json')).toBeNull();
  });
});

describe('indexStatusLabel', () => {
  it('maps index states to topbar labels', () => {
    expect(indexStatusLabel(null)).toBe('Indexing');
    expect(indexStatusLabel({ state: 'indexing', stage: 'parse', revisionSha: null, fileCount: 0, symbolCount: 0, job: null })).toBe(
      'Indexing…'
    );
    expect(
      indexStatusLabel({
        state: 'ready',
        stage: 'ready',
        revisionSha: 'abc1234567890',
        fileCount: 10,
        symbolCount: 5,
        job: null
      })
    ).toBe('Indexed abc1234');
    expect(indexStatusLabel({ state: 'failed', stage: 'failed', revisionSha: null, fileCount: 0, symbolCount: 0, job: null })).toBe(
      'Index failed'
    );
  });
});
