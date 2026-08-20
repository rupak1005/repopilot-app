export type WikiPageKind = 'adr' | 'docs' | 'readme' | 'other';

export type WikiPage = {
  path: string;
  title: string;
  kind: WikiPageKind;
  excerpt: string;
};

export type WikiKindFilter = 'ALL' | WikiPageKind;

export const WIKI_KIND_FILTERS: WikiKindFilter[] = ['ALL', 'adr', 'docs', 'readme', 'other'];

export function parseWikiKindFilter(value: string | string[] | undefined): WikiKindFilter {
  if (value === 'adr' || value === 'docs' || value === 'readme' || value === 'other') return value;
  return 'ALL';
}

export function filterWikiPages(pages: WikiPage[], filter: WikiKindFilter): WikiPage[] {
  if (filter === 'ALL') return pages;
  return pages.filter((page) => page.kind === filter);
}

export function countWikiPagesByKind(pages: WikiPage[]): Record<WikiKindFilter, number> {
  const counts: Record<WikiKindFilter, number> = {
    ALL: pages.length,
    adr: 0,
    docs: 0,
    readme: 0,
    other: 0
  };
  for (const page of pages) {
    counts[page.kind] += 1;
  }
  return counts;
}

export function wikiKindLabel(kind: WikiKindFilter): string {
  if (kind === 'ALL') return 'All';
  if (kind === 'adr') return 'ADRs';
  if (kind === 'docs') return 'Docs';
  if (kind === 'readme') return 'READMEs';
  return 'Other';
}
