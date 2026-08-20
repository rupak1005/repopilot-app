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

export type ArchitectureHrefOpts = {
  revisionSha?: string | null;
  file?: string;
  blast?: boolean;
};

export function architectureHref(
  repoId: string,
  revisionShaOrOpts?: string | null | ArchitectureHrefOpts
): string {
  const opts: ArchitectureHrefOpts =
    typeof revisionShaOrOpts === 'string' || revisionShaOrOpts == null
      ? { revisionSha: revisionShaOrOpts }
      : revisionShaOrOpts;
  const params = new URLSearchParams();
  if (opts.file) params.set('file', opts.file);
  if (opts.blast) params.set('blast', '1');
  if (opts.revisionSha) params.set(REVISION_QUERY_KEY, opts.revisionSha);
  const q = params.toString();
  return q ? `/dashboard/${repoId}/architecture?${q}` : `/dashboard/${repoId}/architecture`;
}

export type ImpactHrefOpts = {
  file?: string;
  pull?: string | number;
  symbol?: string;
  revisionSha?: string | null;
};

export function impactHref(repoId: string, opts: ImpactHrefOpts = {}): string {
  const params = new URLSearchParams();
  if (opts.file) params.set('file', opts.file);
  if (opts.pull != null && String(opts.pull).trim()) params.set('pull', String(opts.pull));
  if (opts.symbol) params.set('symbol', opts.symbol);
  if (opts.revisionSha) params.set(REVISION_QUERY_KEY, opts.revisionSha);
  const q = params.toString();
  return q ? `/dashboard/${repoId}/impact?${q}` : `/dashboard/${repoId}/impact`;
}

/** Next.js shallow-route query bag for Impact, preserving `rev` when set. */
export function impactRouteQuery(
  mode: 'file' | 'pull' | 'symbol',
  values: { file?: string; pull?: string; symbol?: string },
  revisionSha?: string | null
): Record<string, string> {
  const query: Record<string, string> = {};
  if (mode === 'file' && values.file) query.file = values.file;
  if (mode === 'pull' && values.pull) query.pull = values.pull;
  if (mode === 'symbol' && values.symbol) query.symbol = values.symbol;
  if (revisionSha) query[REVISION_QUERY_KEY] = revisionSha;
  return query;
}

export function revisionSelectLabel(row: RevisionRow, index: number): string {
  const short = row.revisionSha.slice(0, 7);
  return index === 0 ? `${short} · latest` : short;
}

export function matchRevisionValue(revisions: RevisionRow[], sha: string | null): string {
  if (!sha) return '';
  const hit = revisions.find(
    (row) =>
      row.revisionSha === sha || row.revisionSha.startsWith(sha) || sha.startsWith(row.revisionSha)
  );
  return hit?.revisionSha ?? '';
}

export function isKnownRevision(revisions: RevisionRow[], sha: string | null): boolean {
  if (!sha) return true;
  return Boolean(matchRevisionValue(revisions, sha));
}
