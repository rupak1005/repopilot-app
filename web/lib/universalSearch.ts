import type { HistoryHit } from './history';
import type { SearchHit } from './types';

export type UniversalSearchScope = 'all' | 'code' | 'history';

export const UNIVERSAL_SEARCH_SCOPES: Array<{ id: UniversalSearchScope; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'code', label: 'Code' },
  { id: 'history', label: 'History' }
];

export function parseSearchScope(value: string | string[] | undefined): UniversalSearchScope {
  if (value === 'code' || value === 'history' || value === 'all') return value;
  return 'all';
}

export function filterHistoryHits(hits: HistoryHit[], query: string): HistoryHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return hits;
  return hits.filter(
    (hit) =>
      hit.title.toLowerCase().includes(q) ||
      hit.snippet.toLowerCase().includes(q) ||
      hit.id.toLowerCase().includes(q)
  );
}

export function universalSearchCounts(code: SearchHit[], history: HistoryHit[]) {
  return {
    code: code.length,
    history: history.length,
    all: code.length + history.length
  };
}

export function shouldShowCodeResults(scope: UniversalSearchScope): boolean {
  return scope === 'all' || scope === 'code';
}

export function shouldShowHistoryResults(scope: UniversalSearchScope): boolean {
  return scope === 'all' || scope === 'history';
}
