import { describe, expect, it } from 'vitest';
import {
  coChangePairsForCommit,
  computeHotspotScore,
  hotspotExplanation,
  parseGitLogOutput
} from './historyIngest';

describe('parseGitLogOutput', () => {
  it('parses commit metadata and changed files', () => {
    const output = [
      'COMMIT|abc123|Alice|alice@example.com|2026-01-02T10:00:00+00:00|Add helper',
      'M\tsrc/util.ts',
      'A\tsrc/new.ts',
      'COMMIT|def456|Bob|bob@example.com|2026-01-03T10:00:00+00:00|Remove legacy',
      'D\tsrc/old.ts'
    ].join('\n');

    const commits = parseGitLogOutput(output);
    expect(commits).toHaveLength(2);
    expect(commits[0]?.sha).toBe('abc123');
    expect(commits[0]?.files).toEqual([
      { filePath: 'src/util.ts', changeType: 'modified' },
      { filePath: 'src/new.ts', changeType: 'added' }
    ]);
    expect(commits[1]?.files[0]).toEqual({
      filePath: 'src/old.ts',
      changeType: 'deleted'
    });
  });
});

describe('coChangePairsForCommit', () => {
  it('generates sorted unique pairs with cap', () => {
    const pairs = coChangePairsForCommit(['b.ts', 'a.ts', 'c.ts'], 3);
    expect(pairs).toEqual([
      ['a.ts', 'b.ts'],
      ['a.ts', 'c.ts'],
      ['b.ts', 'c.ts']
    ]);
  });
});

describe('hotspot scoring', () => {
  it('ranks higher-change higher-dependency files higher', () => {
    const low = computeHotspotScore({
      changeCount: 1,
      dependentCount: 0,
      coChangeCount: 0,
      findingsCount: 0
    });
    const high = computeHotspotScore({
      changeCount: 10,
      dependentCount: 5,
      coChangeCount: 3,
      findingsCount: 2
    });
    expect(high).toBeGreaterThan(low);
  });

  it('builds human-readable reasons', () => {
    const reasons = hotspotExplanation({
      changeCount: 4,
      dependentCount: 2,
      coChangeCount: 1,
      findingsCount: 1
    });
    expect(reasons.length).toBe(4);
  });
});
