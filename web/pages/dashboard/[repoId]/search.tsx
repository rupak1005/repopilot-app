import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { CircleNotch, MagnifyingGlass } from '@phosphor-icons/react';
import { DashboardLayout, useDashboardContext } from '../../../lib/dashboard';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { InlineSpinner } from '../../../components/ui/InlineSpinner';
import { SearchHitRow } from '../../../components/ui/SearchHitRow';
import { repoApiPath } from '../../../lib/serverApi';
import { demoDelay, demoSearchResults } from '../../../lib/demoData';
import { isDemoMode } from '../../../lib/demoMode';
import { type SearchHit } from '../../../lib/types';

export default function SearchPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const repoFullName = dash?.repoFullName;
  const queryFromUrl = typeof router.query.q === 'string' ? router.query.q : '';
  const [query, setQuery] = useState(queryFromUrl);
  const [results, setResults] = useState<SearchHit[]>([]);
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
        setResults(demoSearchResults(nextQuery));
        return;
      }

      const response = await fetch(repoApiPath(repoId, 'search'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nextQuery, topK: 10 })
      });
      if (!response.ok) {
        throw new Error(
          'Search failed — index the repo first (./scripts/index-repo.sh owner/repo) or enable demo mode.'
        );
      }
      const data = (await response.json()) as { results: SearchHit[] };
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
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
      { pathname: `/dashboard/${repoId}/search`, query: { q: nextQuery } },
      undefined,
      { shallow: true }
    );
  }

  return (
    <DashboardLayout activeNav="search">
      <div className="canvas-inner ui-search-page">
        <div className="page-title-block">
          <h1>Search</h1>
          <p>Semantic search across indexed files.</p>
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

          {loading ? (
            <InlineSpinner label="Searching indexed files…" className="ui-search-loading" />
          ) : results.length > 0 ? (
            <>
              <p className="ui-search-meta">
                {results.length} match{results.length === 1 ? '' : 'es'}
              </p>
              <ul className="ui-search-hits">
                {results.map((hit) => (
                  <SearchHitRow
                    key={`${hit.file}:${hit.lines[0]}`}
                    hit={hit}
                    repoId={repoId}
                    repoFullName={repoFullName}
                  />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              compact
              icon={MagnifyingGlass}
              title={hasSearched ? 'No matches found' : 'Run a query to see matches'}
              description={
                hasSearched
                  ? 'Try different keywords or check that the repo is indexed.'
                  : 'Semantic search runs against your indexed codebase.'
              }
            />
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
