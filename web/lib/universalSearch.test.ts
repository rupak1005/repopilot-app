import { describe, expect, it } from 'vitest';
import {
  filterHistoryHits,
  parseSearchScope,
  shouldShowCodeResults,
  shouldShowHistoryResults,
  universalSearchCounts
} from './universalSearch';

describe('universalSearch', () => {
  it('parses scope query values', () => {
    expect(parseSearchScope('history')).toBe('history');
    expect(parseSearchScope('nope')).toBe('all');
  });

  it('filters history hits by query', () => {
    const hits = [
      {
        type: 'commit' as const,
        id: 'abc',
        title: 'Fix auth race',
        snippet: 'middleware'
      },
      {
        type: 'pull_request' as const,
        id: '12',
        title: 'Docs polish',
        snippet: 'readme'
      }
    ];
    expect(filterHistoryHits(hits, 'auth')).toHaveLength(1);
    expect(filterHistoryHits(hits, '12')).toHaveLength(1);
  });

  it('counts and scopes result panes', () => {
    expect(universalSearchCounts([{ file: 'a.ts', lines: [1, 1], text: '', score: 1 }], [])).toEqual({
      code: 1,
      history: 0,
      all: 1
    });
    expect(shouldShowCodeResults('history')).toBe(false);
    expect(shouldShowHistoryResults('all')).toBe(true);
  });
});
