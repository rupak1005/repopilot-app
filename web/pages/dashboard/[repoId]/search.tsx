import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import { CircleNotch, MagnifyingGlass } from '@phosphor-icons/react';
import { DashboardLayout } from '../../../lib/dashboard';
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
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoId || !query.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      if (isDemoMode()) {
        await demoDelay();
        setResults(demoSearchResults(query));
        return;
      }

      const response = await fetch(repoApiPath(repoId, 'search'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topK: 10 })
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
            onSubmit={handleSubmit}
            className={`ui-search-form${loading ? ' ui-search-form--loading' : ''}`}
          >
            <input
              className="ui-search-input ui-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="repository sync, auth middleware…"
              aria-label="Search query"
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !query.trim()}
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
                  <SearchHitRow key={`${hit.file}:${hit.lines[0]}`} hit={hit} />
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
