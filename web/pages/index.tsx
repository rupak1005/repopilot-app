import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://repopilot-pi.vercel.app';

type PullRequestRow = {
  pullNumber: number;
  title: string;
  status: string;
  headRevision: string;
  latestReviewStatus: string | null;
  latestReviewOutcome: string | null;
};

type RepositoryAnalytics = {
  totalReviews: number;
  completedReviews: number;
  failedReviews: number;
  averageReviewLatencyMs: number | null;
  findingsBySeverity: Record<string, number>;
};

type HotspotRow = {
  filePath: string;
  score: number;
  changeCount: number;
  reasons: string[];
};

type SearchHit = {
  file: string;
  lines: [number, number];
  text: string;
  score: number;
};

type AskResponse = {
  answer: string;
  confidence: string;
  citations: Array<{ file: string; lines: [number, number] }>;
};

function outcomeIcon(outcome: string | null): string {
  switch (outcome) {
    case 'PASS':
      return '✓';
    case 'WARN':
      return '⚠';
    case 'FAIL':
      return '✕';
    default:
      return '…';
  }
}

export default function HomePage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const [repoId, setRepoId] = useState('');
  const [pulls, setPulls] = useState<PullRequestRow[]>([]);
  const [analytics, setAnalytics] = useState<RepositoryAnalytics | null>(null);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [askQuery, setAskQuery] = useState('');
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [askLoading, setAskLoading] = useState(false);

  useEffect(() => {
    if (!repoId.trim()) {
      setPulls([]);
      setAnalytics(null);
      setHotspots([]);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const [pullResponse, analyticsResponse, hotspotResponse] = await Promise.all([
          fetch(`${apiBase}/api/v1/repositories/${repoId}/pulls`),
          fetch(`${apiBase}/api/v1/repositories/${repoId}/analytics`),
          fetch(`${apiBase}/api/v1/repositories/${repoId}/hotspots?topK=5`)
        ]);

        if (!pullResponse.ok || !analyticsResponse.ok || !hotspotResponse.ok) {
          throw new Error('Failed to load repository dashboard data');
        }

        const pullData = (await pullResponse.json()) as PullRequestRow[];
        const analyticsData = (await analyticsResponse.json()) as RepositoryAnalytics;
        const hotspotData = (await hotspotResponse.json()) as HotspotRow[];
        if (!cancelled) {
          setPulls(pullData);
          setAnalytics(analyticsData);
          setHotspots(hotspotData);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [apiBase, repoId]);

  function handleRepoIdChange(event: ChangeEvent<HTMLInputElement>) {
    setRepoId(event.currentTarget.value);
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!repoId.trim() || !searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/v1/repositories/${repoId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, topK: 5 })
      });
      if (!response.ok) throw new Error('Search failed');
      const data = (await response.json()) as { results: SearchHit[] };
      setSearchResults(data.results ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    if (!repoId.trim() || !askQuery.trim()) return;
    setAskLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/v1/repositories/${repoId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: askQuery })
      });
      if (!response.ok) throw new Error('Ask failed');
      setAskResult((await response.json()) as AskResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask failed');
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 960 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={{ margin: 0 }}>RepoPilot App</h1>
          <p style={{ margin: '4px 0 0' }}>Developer dashboard — search, Q&amp;A, PR reviews.</p>
        </div>
        <a href={MARKETING_URL} style={{ fontSize: 14 }}>
          ← Marketing site
        </a>
      </header>

      <section style={{ marginTop: 24 }}>
        <label htmlFor="repo-id">
          Repository ID
          <input
            id="repo-id"
            value={repoId}
            onChange={handleRepoIdChange}
            placeholder="11111111-1111-1111-1111-111111111111"
            style={{ display: 'block', marginTop: 8, width: '100%', padding: 8 }}
          />
        </label>
      </section>

      {error ? <p style={{ color: '#b00020' }}>{error}</p> : null}

      {repoId.trim() ? (
        <>
          <section style={{ marginTop: 24 }}>
            <h2>Search code</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="repository sync"
                style={{ flex: 1, padding: 8 }}
              />
              <button type="submit" disabled={searchLoading}>
                {searchLoading ? '…' : 'Search'}
              </button>
            </form>
            {searchResults.length > 0 ? (
              <ul>
                {searchResults.map((hit) => (
                  <li key={`${hit.file}:${hit.lines[0]}`}>
                    <strong>{hit.file}</strong> ({hit.lines[0]}–{hit.lines[1]}) — score{' '}
                    {hit.score.toFixed(2)}
                    <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{hit.text.slice(0, 200)}</pre>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section style={{ marginTop: 24 }}>
            <h2>Ask RepoPilot</h2>
            <form onSubmit={handleAsk} style={{ display: 'flex', gap: 8 }}>
              <input
                value={askQuery}
                onChange={(e) => setAskQuery(e.target.value)}
                placeholder="What does syncRepository do?"
                style={{ flex: 1, padding: 8 }}
              />
              <button type="submit" disabled={askLoading}>
                {askLoading ? '…' : 'Ask'}
              </button>
            </form>
            {askResult ? (
              <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <p>
                  <strong>{askResult.confidence}</strong> confidence
                </p>
                <p>{askResult.answer}</p>
                {askResult.citations.length > 0 ? (
                  <ul>
                    {askResult.citations.map((c) => (
                      <li key={`${c.file}:${c.lines[0]}`}>
                        {c.file}:{c.lines[0]}–{c.lines[1]}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {analytics ? (
        <section style={{ marginTop: 24 }}>
          <h2>Repository Health</h2>
          <ul>
            <li>Total reviews: {analytics.totalReviews}</li>
            <li>Completed: {analytics.completedReviews}</li>
            <li>Failed: {analytics.failedReviews}</li>
            <li>
              Average review latency:{' '}
              {analytics.averageReviewLatencyMs
                ? `${analytics.averageReviewLatencyMs} ms`
                : 'n/a'}
            </li>
          </ul>
        </section>
      ) : null}

      {hotspots.length > 0 ? (
        <section style={{ marginTop: 24 }}>
          <h2>Hotspots</h2>
          <ul>
            {hotspots.map((hotspot) => (
              <li key={hotspot.filePath}>
                <strong>{hotspot.filePath}</strong> — score {hotspot.score.toFixed(1)} (
                {hotspot.changeCount} changes)
                {hotspot.reasons[0] ? ` — ${hotspot.reasons[0]}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section style={{ marginTop: 24 }}>
        <h2>Pull Requests</h2>
        {pulls.length === 0 ? (
          <p>No pull requests loaded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">PR</th>
                <th align="left">Title</th>
                <th align="left">Review</th>
                <th align="left">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {pulls.map((pull) => (
                <tr key={pull.pullNumber}>
                  <td>#{pull.pullNumber}</td>
                  <td>{pull.title}</td>
                  <td>{pull.latestReviewStatus ?? 'none'}</td>
                  <td>
                    {outcomeIcon(pull.latestReviewOutcome)} {pull.latestReviewOutcome ?? 'pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
