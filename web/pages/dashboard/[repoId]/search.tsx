import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { DashboardLayout } from '../../../lib/dashboard';
import { Button } from '../../../components/ui/Button';
import { SearchHitRow } from '../../../components/ui/SearchHitRow';
import { API_BASE, type SearchHit } from '../../../lib/types';

export default function SearchPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoId || !query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/repositories/${repoId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topK: 10 })
      });
      if (!response.ok) throw new Error('Search failed — is this repo indexed?');
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

        {error ? <div className="error-banner">{error}</div> : null}

        <section className="ui-search-panel">
          <form onSubmit={handleSubmit} className="ui-search-form">
            <input
              className="ui-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="repository sync, auth middleware…"
              aria-label="Search query"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !query.trim()}
              icon={<MagnifyingGlass size={16} weight="light" />}
            >
              {loading ? '…' : 'Search'}
            </Button>
          </form>

          {results.length > 0 ? (
            <ul className="ui-search-hits">
              {results.map((hit) => (
                <SearchHitRow key={`${hit.file}:${hit.lines[0]}`} hit={hit} />
              ))}
            </ul>
          ) : (
            <p className="empty-state">Run a query to see matches.</p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
