import { describe, expect, it } from 'vitest';
import { OVERVIEW_ACTIONS, overviewPulse } from './overview';
import type { RepositoryIndexStatus } from './indexStatus';

const ready: RepositoryIndexStatus = {
  state: 'ready',
  stage: 'ready',
  revisionSha: 'abcdef123456',
  fileCount: 1200,
  symbolCount: 4000,
  job: null
};

describe('overview', () => {
  it('lists primary overview actions', () => {
    expect(OVERVIEW_ACTIONS.some((a) => a.id === 'ask' && a.primary)).toBe(true);
    expect(OVERVIEW_ACTIONS.map((a) => a.path)).toContain('/history');
  });

  it('summarizes a ready index pulse', () => {
    const pulse = overviewPulse({ indexStatus: ready, pullCount: 2, hotspotCount: 5 });
    expect(pulse.headline).toContain('abcdef1');
    expect(pulse.detail).toContain('1,200 files');
    expect(pulse.detail).toContain('2 open PRs');
  });

  it('prompts indexing when not indexed', () => {
    const pulse = overviewPulse({
      indexStatus: {
        state: 'not_indexed',
        stage: 'clone',
        revisionSha: null,
        fileCount: 0,
        symbolCount: 0,
        job: null
      },
      pullCount: 0,
      hotspotCount: 0
    });
    expect(pulse.headline.toLowerCase()).toContain('not indexed');
  });

  it('shows checking while status is still loading', () => {
    const pulse = overviewPulse({ indexStatus: null, pullCount: 0, hotspotCount: 0 });
    expect(pulse.headline.toLowerCase()).toContain('checking');
  });
});
