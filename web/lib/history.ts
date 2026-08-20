export type HistoryHit = {
  type: 'commit' | 'pull_request';
  id: string;
  title: string;
  snippet: string;
  authoredAt?: string;
};

export type RevisionRow = {
  revisionSha: string;
  indexedAt: string;
};

export function shortSha(sha: string): string {
  return sha.trim().slice(0, 7);
}

export function formatIndexedAt(indexedAt: string): string {
  const d = new Date(indexedAt);
  if (Number.isNaN(d.getTime())) return indexedAt;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
