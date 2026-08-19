import { useEffect, useState, type ChangeEvent } from 'react';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoId.trim()) {
      setPulls([]);
      setAnalytics(null);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const [pullResponse, analyticsResponse] = await Promise.all([
          fetch(`${apiBase}/api/v1/repositories/${repoId}/pulls`),
          fetch(`${apiBase}/api/v1/repositories/${repoId}/analytics`)
        ]);

        if (!pullResponse.ok || !analyticsResponse.ok) {
          throw new Error('Failed to load repository dashboard data');
        }

        const pullData = (await pullResponse.json()) as PullRequestRow[];
        const analyticsData = (await analyticsResponse.json()) as RepositoryAnalytics;
        if (!cancelled) {
          setPulls(pullData);
          setAnalytics(analyticsData);
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

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 960 }}>
      <h1>RepoPilot</h1>
      <p>Production developer platform dashboard (Phase 9).</p>

      <section style={{ marginTop: 24 }}>
        <label htmlFor="repo-id">
          Repository ID
          <input
            id="repo-id"
            value={repoId}
            onChange={handleRepoIdChange}
            placeholder="Paste repository UUID"
            style={{ display: 'block', marginTop: 8, width: '100%', padding: 8 }}
          />
        </label>
      </section>

      {error ? <p style={{ color: '#b00020' }}>{error}</p> : null}

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
