import Link from 'next/link';
import { useRouter } from 'next/router';
import { ClockCounterClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import { type FormEvent, useEffect, useState } from 'react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { IndexHint } from '../../../components/ui/IndexHint';
import { PageLoading } from '../../../components/ui/Skeleton';
import { DashboardLayout, useDashboardContext, useNeedsIndexHint } from '../../../lib/dashboard';
import { isDemoMode } from '../../../lib/demoMode';
import { DEMO_HISTORY_HITS, DEMO_REVISIONS } from '../../../lib/demoData';
import { formatIndexedAt, shortSha, type HistoryHit, type RevisionRow } from '../../../lib/history';
import { architectureHref, impactHref } from '../../../lib/revisionScope';
import { repoApiPath } from '../../../lib/serverApi';

export default function HistoryPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const needsIndex = useNeedsIndexHint(repoId);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<HistoryHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingRevs, setLoadingRevs] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const base = repoId ? `/dashboard/${repoId}` : '';

  useEffect(() => {
    if (!repoId) return;
    if (isDemoMode()) {
      setRevisions(DEMO_REVISIONS);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingRevs(true);
      try {
        const response = await fetch(repoApiPath(repoId!, 'revisions'));
        if (!response.ok) throw new Error('Could not load indexed revisions');
        const data = (await response.json()) as Array<{ revisionSha: string; indexedAt: string }>;
        if (!cancelled) {
          setRevisions(
            data.map((row) => ({
              revisionSha: row.revisionSha,
              indexedAt: typeof row.indexedAt === 'string' ? row.indexedAt : String(row.indexedAt)
            }))
          );
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load revisions');
        }
      } finally {
        if (!cancelled) setLoadingRevs(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  async function runSearch(event?: FormEvent) {
    event?.preventDefault();
    if (!repoId || !query.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setError(null);
    try {
      if (isDemoMode()) {
        setHits(
          DEMO_HISTORY_HITS.filter(
            (h) =>
              h.title.toLowerCase().includes(query.trim().toLowerCase()) ||
              h.snippet.toLowerCase().includes(query.trim().toLowerCase())
          )
        );
        return;
      }
      const response = await fetch(repoApiPath(repoId, 'search/history'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), topK: 20 })
      });
      if (!response.ok) throw new Error('History search failed — run history ingest first.');
      setHits((await response.json()) as HistoryHit[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'History search failed');
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <DashboardLayout activeNav="history">
      <div className="canvas-inner ui-history-page">
        <div className="page-title-block">
          <h1>History</h1>
          <p>Indexed revisions and commit / PR history search for this repository.</p>
        </div>

        {needsIndex ? <IndexHint repoFullName={dash?.repoFullName} /> : null}

        {error ? <ErrorBanner onDismiss={() => setError(null)}>{error}</ErrorBanner> : null}

        <BentoPanel title="Indexed revisions">
          {loadingRevs ? (
            <PageLoading label="Loading revisions…" />
          ) : revisions.length === 0 ? (
            <EmptyState
              compact
              icon={ClockCounterClockwise}
              title="No revisions indexed yet"
              description="Index the repository to capture SHA snapshots."
            />
          ) : (
            <ul className="ui-history-revisions">
              {revisions.map((rev, index) => (
                <li key={rev.revisionSha} className="ui-history-revision">
                  <span className="mono ui-history-revision__sha">{shortSha(rev.revisionSha)}</span>
                  <span className="ui-history-revision__meta">
                    {index === 0 ? 'Latest · ' : ''}
                    {formatIndexedAt(rev.indexedAt)}
                  </span>
                  {repoId ? (
                    <span className="ui-history-revision__links">
                      <Link
                        className="ui-history-revision__link"
                        href={architectureHref(repoId, rev.revisionSha)}
                        title="Open dependency graph at this revision"
                      >
                        Graph
                      </Link>
                      <Link
                        className="ui-history-revision__link"
                        href={impactHref(repoId, { revisionSha: rev.revisionSha })}
                        title="Open impact analysis at this revision"
                      >
                        Impact
                      </Link>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </BentoPanel>

        <BentoPanel title="Search commits & PRs">
          <form className="ui-history-search" onSubmit={(e) => void runSearch(e)}>
            <input
              className="ui-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="auth migrate, fix race…"
              aria-label="History search query"
            />
            <Button type="submit" variant="primary" disabled={!query.trim() || searching}>
              {searching ? 'Searching…' : 'Search history'}
            </Button>
          </form>

          {hits.length > 0 ? (
            <ul className="ui-history-hits">
              {hits.map((hit) => (
                <li key={`${hit.type}:${hit.id}`} className="ui-history-hit">
                  <div className="ui-history-hit__head">
                    <span className="label-caps">{hit.type === 'commit' ? 'Commit' : 'Pull request'}</span>
                    <span className="mono">{hit.type === 'commit' ? shortSha(hit.id) : `#${hit.id}`}</span>
                    {hit.authoredAt ? (
                      <span className="ui-history-hit__when">{formatIndexedAt(hit.authoredAt)}</span>
                    ) : null}
                  </div>
                  <p className="ui-history-hit__title">{hit.title}</p>
                  <pre className="ui-history-hit__snippet">{hit.snippet}</pre>
                  {base && hit.type === 'pull_request' ? (
                    <Link className="ui-history-hit__link" href={`${base}/pulls/${hit.id}`}>
                      Open PR →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={MagnifyingGlass}
              title={hasSearched ? 'No history matches' : 'Search indexed git history'}
              description={
                hasSearched
                  ? 'Try different keywords or ingest more history on the API.'
                  : 'Messages and PR titles from history ingest appear here.'
              }
            />
          )}
        </BentoPanel>
      </div>
    </DashboardLayout>
  );
}
