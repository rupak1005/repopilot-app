import { describe, expect, it } from 'vitest';
import {
  activityUnreadCount,
  buildActivityItems,
  helpTipForNav
} from './shellChrome';
import type { RepositoryIndexStatus } from './indexStatus';

describe('shellChrome', () => {
  it('maps each nav key to a contextual help tip', () => {
    expect(helpTipForNav('ask').title.toLowerCase()).toContain('ask');
    expect(helpTipForNav('architecture').docHref).toBe('/docs/architecture');
    expect(helpTipForNav('impact').secondaryHref).toBeTruthy();
  });

  it('marks a newly ready index as unread until seen', () => {
    const status: RepositoryIndexStatus = {
      state: 'ready',
      stage: 'ready',
      revisionSha: 'abcdef123456',
      fileCount: 1200,
      symbolCount: 4500,
      job: null
    };
    const unread = buildActivityItems({
      repoId: 'r1',
      repoFullName: 'ada/livedocs',
      indexStatus: status,
      seenReadySha: null
    });
    expect(activityUnreadCount(unread)).toBe(1);
    expect(unread[0]?.body).toContain('1.2k files');

    const seen = buildActivityItems({
      repoId: 'r1',
      repoFullName: 'ada/livedocs',
      indexStatus: status,
      seenReadySha: 'abcdef123456'
    });
    expect(activityUnreadCount(seen)).toBe(0);
  });
});
