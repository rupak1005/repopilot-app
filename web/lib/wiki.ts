export type WikiPageKind = 'adr' | 'docs' | 'readme' | 'other';

export type WikiPage = {
  path: string;
  title: string;
  kind: WikiPageKind;
  excerpt: string;
};

export type WikiPageDetail = WikiPage & {
  content: string;
};

export type WikiKindFilter = 'ALL' | WikiPageKind;

export const WIKI_KIND_FILTERS: WikiKindFilter[] = ['ALL', 'adr', 'docs', 'readme', 'other'];

export function parseWikiKindFilter(value: string | string[] | undefined): WikiKindFilter {
  if (value === 'adr' || value === 'docs' || value === 'readme' || value === 'other') return value;
  return 'ALL';
}

export function parseWikiPathQuery(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim().replace(/\\/g, '/');
  return path.length > 0 ? path : null;
}

export function wikiHref(
  repoId: string,
  opts: { path?: string | null; kind?: WikiKindFilter; revisionSha?: string | null } = {}
): string {
  const params = new URLSearchParams();
  if (opts.path) params.set('path', opts.path);
  if (opts.kind && opts.kind !== 'ALL') params.set('kind', opts.kind);
  if (opts.revisionSha) params.set('rev', opts.revisionSha);
  const q = params.toString();
  return q ? `/dashboard/${repoId}/wiki?${q}` : `/dashboard/${repoId}/wiki`;
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
