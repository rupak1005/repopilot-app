import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CircleNotch, ClockCounterClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import { DashboardLayout, useDashboardContext } from '../../../lib/dashboard';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { InlineSpinner } from '../../../components/ui/InlineSpinner';
import { SearchHitRow } from '../../../components/ui/SearchHitRow';
import { DEMO_HISTORY_HITS, demoDelay, demoSearchResults } from '../../../lib/demoData';
import { isDemoMode } from '../../../lib/demoMode';
import { formatIndexedAt, shortSha, type HistoryHit } from '../../../lib/history';
import { repoApiPath } from '../../../lib/serverApi';
import { type SearchHit } from '../../../lib/types';
import {
  UNIVERSAL_SEARCH_SCOPES,
  filterHistoryHits,
  parseSearchScope,
  shouldShowCodeResults,
  shouldShowHistoryResults,
  universalSearchCounts,
  type UniversalSearchScope
} from '../../../lib/universalSearch';

export default function SearchPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const repoFullName = dash?.repoFullName;
  const base = repoId ? `/dashboard/${repoId}` : '';
  const queryFromUrl = typeof router.query.q === 'string' ? router.query.q : '';
  const scope = parseSearchScope(router.query.scope);
  const [query, setQuery] = useState(queryFromUrl);
  const [codeResults, setCodeResults] = useState<SearchHit[]>([]);
  const [historyResults, setHistoryResults] = useState<HistoryHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const autoSearchedKey = useRef<string | null>(null);

  async function runSearch(nextQuery: string) {
    if (!repoId || !nextQuery.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      if (isDemoMode()) {
        await demoDelay();
        setCodeResults(demoSearchResults(nextQuery));
        setHistoryResults(filterHistoryHits(DEMO_HISTORY_HITS, nextQuery));
        return;
      }

      const [codeResponse, historyResponse] = await Promise.all([
        fetch(repoApiPath(repoId, 'search'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: nextQuery, topK: 10 })
        }),
        fetch(repoApiPath(repoId, 'search/history'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: nextQuery, topK: 10 })
        })
      ]);

      if (!codeResponse.ok && !historyResponse.ok) {
        throw new Error(
          'Search failed — index the repo first (./scripts/index-repo.sh owner/repo) or enable demo mode.'
        );
      }

      if (codeResponse.ok) {
        const data = (await codeResponse.json()) as { results: SearchHit[] };
        setCodeResults(data.results ?? []);
      } else {
        setCodeResults([]);
      }

      if (historyResponse.ok) {
        const data = (await historyResponse.json()) as HistoryHit[] | { results?: HistoryHit[]; hits?: HistoryHit[] };
        setHistoryResults(Array.isArray(data) ? data : (data.results ?? data.hits ?? []));
      } else {
        setHistoryResults([]);
      }

      if (!codeResponse.ok || !historyResponse.ok) {
        setError('Partial results — one search source failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setCodeResults([]);
      setHistoryResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    if (typeof router.query.q === 'string') {
      setQuery(router.query.q);
    }
  }, [router.isReady, router.query.q]);

  useEffect(() => {
    if (!router.isReady || !repoId) return;
    const q = typeof router.query.q === 'string' ? router.query.q.trim() : '';
    if (!q) return;
    const key = `${repoId}:${q}`;
    if (autoSearchedKey.current === key) return;
    autoSearchedKey.current = key;
    void runSearch(q);
  }, [router.isReady, repoId, router.query.q]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoId || !query.trim() || loading) return;
    const nextQuery = query.trim();
    autoSearchedKey.current = `${repoId}:${nextQuery}`;
    await runSearch(nextQuery);
    void router.replace(
      {
        pathname: `/dashboard/${repoId}/search`,
        query: { q: nextQuery, ...(scope !== 'all' ? { scope } : {}) }
      },
      undefined,
      { shallow: true }
    );
  }

  function setScope(next: UniversalSearchScope) {
    if (!repoId) return;
    const queryParams: Record<string, string> = {};
    if (query.trim()) queryParams.q = query.trim();
    if (next !== 'all') queryParams.scope = next;
    void router.replace(
      { pathname: `/dashboard/${repoId}/search`, query: queryParams },
      undefined,
      { shallow: true }
    );
  }

  const counts = universalSearchCounts(codeResults, historyResults);
  const showCode = shouldShowCodeResults(scope);
  const showHistory = shouldShowHistoryResults(scope);
  const visibleEmpty =
    hasSearched &&
    !loading &&
    ((scope === 'code' && codeResults.length === 0) ||
      (scope === 'history' && historyResults.length === 0) ||
      (scope === 'all' && counts.all === 0));

  return (
    <DashboardLayout activeNav="search">
      <div className="canvas-inner ui-search-page">
        <div className="page-title-block">
          <h1>Search</h1>
          <p>Code and git history in one query — files, commits, and pull requests.</p>
        </div>

        {error ? <ErrorBanner onDismiss={() => setError(null)}>{error}</ErrorBanner> : null}

        <section className="ui-search-panel">
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className={`ui-search-form${loading ? ' ui-search-form--loading' : ''}`}
            aria-busy={loading}
          >
            <input
              className="ui-search-input ui-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="repository sync, auth middleware…"
              aria-label="Search query"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!query.trim()}
              icon={
                loading ? (
                  <CircleNotch size={16} weight="bold" className="ui-inline-spinner__icon" aria-hidden />
                ) : (
                  <MagnifyingGlass size={16} weight="light" />
                )
              }
            >
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </form>

          <div className="ui-search-scopes" role="tablist" aria-label="Search scope">
            {UNIVERSAL_SEARCH_SCOPES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={scope === item.id}
                className={`ui-search-scope${scope === item.id ? ' ui-search-scope--active' : ''}`}
                onClick={() => setScope(item.id)}
              >
                {item.label}
                {hasSearched && !loading ? (
                  <span className="ui-search-scope__count">{counts[item.id]}</span>
                ) : null}
              </button>
            ))}
          </div>

          {loading ? (
            <InlineSpinner label="Searching code and history…" className="ui-search-loading" />
          ) : null}

          {!loading && showCode && codeResults.length > 0 ? (
            <div className="ui-search-section">
              <h2 className="ui-search-section__title label-caps">Code</h2>
              <p className="ui-search-meta">
                {codeResults.length} file match{codeResults.length === 1 ? '' : 'es'}
              </p>
              <ul className="ui-search-hits">
                {codeResults.map((hit) => (
                  <SearchHitRow
                    key={`${hit.file}:${hit.lines[0]}`}
                    hit={hit}
                    repoId={repoId}
                    repoFullName={repoFullName}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {!loading && showHistory && historyResults.length > 0 ? (
            <div className="ui-search-section">
              <h2 className="ui-search-section__title label-caps">History</h2>
              <p className="ui-search-meta">
                {historyResults.length} history hit{historyResults.length === 1 ? '' : 's'}
              </p>
              <ul className="ui-search-hits">
                {historyResults.map((hit) => (
                  <li key={`${hit.type}:${hit.id}`} className="ui-search-hit ui-search-hit--history">
                    <div className="ui-search-hit__head">
                      <span className="label-caps">
                        {hit.type === 'commit' ? 'Commit' : 'Pull request'}
                      </span>
                      <span className="mono">
                        {hit.type === 'commit' ? shortSha(hit.id) : `#${hit.id}`}
                      </span>
                      {hit.authoredAt ? (
                        <span className="ui-search-hit__when">{formatIndexedAt(hit.authoredAt)}</span>
                      ) : null}
                    </div>
                    <p className="ui-search-hit__title">{hit.title}</p>
                    <pre className="ui-search-hit__snippet">{hit.snippet}</pre>
                    {base && hit.type === 'pull_request' ? (
                      <Link className="ui-search-hit__link" href={`${base}/pulls/${hit.id}`}>
                        Open PR →
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {visibleEmpty ? (
            <EmptyState
              compact
              icon={scope === 'history' ? ClockCounterClockwise : MagnifyingGlass}
              title="No matches found"
              description={
                scope === 'history'
                  ? 'Try different keywords or open History for the full revision timeline.'
                  : 'Try different keywords or check that the repo is indexed.'
              }
            />
          ) : null}

          {!hasSearched && !loading ? (
            <EmptyState
              compact
              icon={MagnifyingGlass}
              title="Run a query to see matches"
              description="One search covers indexed files plus commit and PR history."
            />
          ) : null}
        </section>
      </div>
    </DashboardLayout>
  );
}
