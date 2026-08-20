import { describe, expect, it } from 'vitest';
import {
  countWikiPagesByKind,
  filterWikiPages,
  parseWikiKindFilter,
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
});
