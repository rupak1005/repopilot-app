import { describe, expect, it } from 'vitest';
import {
  countWikiPagesByKind,
  filterWikiPages,
  parseWikiKindFilter,
  parseWikiPathQuery,
  wikiHref,
  type WikiPage
} from './wiki';

const PAGES: WikiPage[] = [
  { path: 'docs/adr/1.md', title: 'Auth', kind: 'adr', excerpt: 'Decide auth' },
  { path: 'docs/guide.md', title: 'Guide', kind: 'docs', excerpt: 'How to' },
  { path: 'README.md', title: 'Readme', kind: 'readme', excerpt: 'Intro' }
];

describe('wiki', () => {
  it('parses kind filters', () => {
    expect(parseWikiKindFilter('adr')).toBe('adr');
    expect(parseWikiKindFilter('nope')).toBe('ALL');
  });

  it('filters and counts by kind', () => {
    expect(filterWikiPages(PAGES, 'adr')).toHaveLength(1);
    expect(countWikiPagesByKind(PAGES)).toEqual({
      ALL: 3,
      adr: 1,
      docs: 1,
      readme: 1,
      other: 0
    });
  });

  it('builds reader deep links', () => {
    expect(parseWikiPathQuery('docs/adr/1.md')).toBe('docs/adr/1.md');
    expect(parseWikiPathQuery('docs%2FAI_PROVIDERS.md')).toBe('docs/AI_PROVIDERS.md');
    expect(wikiHref('r1', { path: 'README.md', revisionSha: 'abc1234' })).toBe(
      '/dashboard/r1/wiki?path=README.md&rev=abc1234'
    );
  });
});
