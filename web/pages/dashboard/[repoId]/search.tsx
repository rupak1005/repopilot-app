import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../../lib/dashboard';
import { Icon } from '../../../components/Icon';
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
      <div className="canvas-inner search-panel">
        <div className="page-title-block">
          <h1>Search</h1>
          <p>Semantic search across indexed files.</p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <section className="panel" style={{ padding: 16 }}>
          <form onSubmit={handleSubmit} className="search-form">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="repository sync, auth middleware…"
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              <Icon name="search" size={16} />
              {loading ? '…' : 'Search'}
            </button>
          </form>

          {results.length > 0 ? (
            <ul className="hit-list">
              {results.map((hit) => (
                <li key={`${hit.file}:${hit.lines[0]}`}>
                  <strong className="mono">{hit.file}</strong>
                  <div className="hit-meta">
                    Lines {hit.lines[0]}–{hit.lines[1]} · score {hit.score.toFixed(2)}
                  </div>
                  <pre className="hit-snippet">{hit.text.slice(0, 280)}</pre>
                </li>
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
