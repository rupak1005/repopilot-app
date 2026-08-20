import type { RevisionRow } from './history';

/** Query key for revision-scoped dashboard views (`?rev=`). */
export const REVISION_QUERY_KEY = 'rev';

export function parseRevisionQuery(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  const sha = value.trim();
  return sha.length >= 7 ? sha : null;
}

/** Append `revisionSha` to a BFF subpath that may already include query params. */
export function withRevisionSha(subpath: string, revisionSha: string | null | undefined): string {
  if (!revisionSha) return subpath;
  const join = subpath.includes('?') ? '&' : '?';
  return `${subpath}${join}revisionSha=${encodeURIComponent(revisionSha)}`;
}

export function architectureHref(repoId: string, revisionSha?: string | null): string {
  const base = `/dashboard/${repoId}/architecture`;
  if (!revisionSha) return base;
  return `${base}?${REVISION_QUERY_KEY}=${encodeURIComponent(revisionSha)}`;
}

export function revisionSelectLabel(row: RevisionRow, index: number): string {
  const short = row.revisionSha.slice(0, 7);
  return index === 0 ? `${short} · latest` : short;
}

export function isKnownRevision(revisions: RevisionRow[], sha: string | null): boolean {
  if (!sha) return true;
  return revisions.some(
    (row) => row.revisionSha === sha || row.revisionSha.startsWith(sha) || sha.startsWith(row.revisionSha)
  );
}
