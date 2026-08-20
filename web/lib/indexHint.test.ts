import { describe, expect, it } from 'vitest';
import { shouldShowIndexHint, showIndexHint } from './indexHint';
import type { RepositoryAnalytics } from './types';

const emptyAnalytics: RepositoryAnalytics = {
  totalReviews: 0,
  completedReviews: 0,
  failedReviews: 0,
  averageReviewLatencyMs: null,
  findingsBySeverity: {}
};

describe('showIndexHint', () => {
  it('is true when pulls, hotspots, and reviews are empty', () => {
    expect(showIndexHint([], [], emptyAnalytics)).toBe(true);
  });

  it('is false when demo data exists', () => {
    expect(
      showIndexHint(
        [{ pullNumber: 1, title: 't', status: 'open', headRevision: 'abc', latestReviewStatus: null, latestReviewOutcome: null }],
        [],
        emptyAnalytics
      )
    ).toBe(false);
  });
});

describe('shouldShowIndexHint', () => {
  it('hides hint while indexing', () => {
    expect(
      shouldShowIndexHint([], [], emptyAnalytics, {
        state: 'indexing',
        stage: 'clone',
        revisionSha: null,
        fileCount: 0,
        symbolCount: 0,
        job: null
      }, 'repo-id', null)
    ).toBe(false);
  });

  it('hides hint while a float job is pending', () => {
    expect(
      shouldShowIndexHint([], [], emptyAnalytics, {
        state: 'not_indexed',
        stage: 'clone',
        revisionSha: null,
        fileCount: 0,
        symbolCount: 0,
        job: null
      }, 'repo-id', 'repo-id')
    ).toBe(false);
  });
});
