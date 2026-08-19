import { useRouter } from 'next/router';
import { DashboardLayout, useRepoData } from '../../../lib/dashboard';
import { outcomeIcon } from '../../../lib/types';

export default function OverviewPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { pulls, analytics, hotspots, error, loading } = useRepoData(repoId);

  return (
    <DashboardLayout title="Overview" subtitle="Repository health at a glance.">
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="empty-state">Loading repository data…</p> : null}

      {analytics ? (
        <section className="card">
          <h2>Repository health</h2>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Total reviews</div>
              <div className="stat-value">{analytics.totalReviews}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Completed</div>
              <div className="stat-value">{analytics.completedReviews}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Failed</div>
              <div className="stat-value">{analytics.failedReviews}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg latency</div>
              <div className="stat-value" style={{ fontSize: 16 }}>
                {analytics.averageReviewLatencyMs
                  ? `${analytics.averageReviewLatencyMs} ms`
                  : 'n/a'}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {hotspots.length > 0 ? (
        <section className="card">
          <h2>Top hotspots</h2>
          <ul className="hit-list">
            {hotspots.map((hotspot) => (
              <li key={hotspot.filePath}>
                <strong>{hotspot.filePath}</strong>
                <div className="hit-meta">
                  Score {hotspot.score.toFixed(1)} · {hotspot.changeCount} changes
                  {hotspot.reasons[0] ? ` · ${hotspot.reasons[0]}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <h2>Recent pull requests</h2>
        {pulls.length === 0 ? (
          <p className="empty-state">No pull requests indexed yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PR</th>
                <th>Title</th>
                <th>Review</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {pulls.slice(0, 8).map((pull) => (
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
    </DashboardLayout>
  );
}
