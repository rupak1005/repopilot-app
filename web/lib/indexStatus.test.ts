import { describe, expect, it } from 'vitest';
import {
  isIndexStale,
  isRepoIndexInProgress,
  indexProgressPercent,
  indexStageProgressCap,
  indexStatusLabel,
  parseIndexStreamPayload
} from './indexStatus';

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

describe('isRepoIndexInProgress', () => {
  it('treats active float jobs as in-progress until ready or failed', () => {
    const repoId = 'abc';
    expect(isRepoIndexInProgress(repoId, null, repoId)).toBe(true);
    expect(
      isRepoIndexInProgress(repoId, {
        state: 'not_indexed',
        stage: 'clone',
        revisionSha: null,
        fileCount: 0,
        symbolCount: 0,
        job: null
      }, repoId)
    ).toBe(true);
    expect(
      isRepoIndexInProgress(repoId, {
        state: 'ready',
        stage: 'ready',
        revisionSha: 'abc1234',
        fileCount: 1,
        symbolCount: 1,
        job: null
      }, repoId)
    ).toBe(false);
  });
});

describe('indexStatusLabel', () => {
  it('maps index states to topbar labels', () => {
    expect(indexStatusLabel(null)).toBe('Checking…');
    expect(
      indexStatusLabel({
        state: 'indexing',
        stage: 'parse',
        revisionSha: null,
        fileCount: 12,
        symbolCount: 0,
        job: null
      })
    ).toMatch(/^Indexing \d+%$/);
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

describe('indexProgressPercent', () => {
  it('returns stage-based percentages while indexing', () => {
    expect(
      indexProgressPercent({
        state: 'indexing',
        stage: 'clone',
        revisionSha: null,
        fileCount: 0,
        symbolCount: 0,
        job: null
      })
    ).toBeGreaterThan(0);
    expect(
      indexProgressPercent({
        state: 'ready',
        stage: 'ready',
        revisionSha: 'abc',
        fileCount: 10,
        symbolCount: 5,
        job: null
      })
    ).toBe(100);
    expect(
      indexProgressPercent({
        state: 'failed',
        stage: 'failed',
        revisionSha: null,
        fileCount: 0,
        symbolCount: 0,
        job: null
      })
    ).toBeNull();
  });

  it('caps creep progress below the next stage', () => {
    expect(
      indexStageProgressCap({
        state: 'indexing',
        stage: 'graph',
        revisionSha: null,
        fileCount: 4,
        symbolCount: 9,
        moduleDependencyCount: 0,
        job: null
      })
    ).toBe(73);
  });
});

describe('isIndexStale', () => {
  it('uses stale flag or compares SHAs when ready', () => {
    expect(
      isIndexStale({
        state: 'ready',
        stage: 'ready',
        revisionSha: 'aaa',
        remoteHeadSha: 'bbb',
        stale: true,
        fileCount: 1,
        symbolCount: 1,
        job: null
      })
    ).toBe(true);
    expect(
      isIndexStale({
        state: 'ready',
        stage: 'ready',
        revisionSha: 'aaa',
        remoteHeadSha: 'aaa',
        fileCount: 1,
        symbolCount: 1,
        job: null
      })
    ).toBe(false);
    expect(
      isIndexStale({
        state: 'indexing',
        stage: 'parse',
        revisionSha: 'aaa',
        remoteHeadSha: 'bbb',
        fileCount: 1,
        symbolCount: 0,
        job: null
      })
    ).toBe(false);
  });
});
