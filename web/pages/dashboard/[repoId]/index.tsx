import Link from 'next/link';
import { useRouter } from 'next/router';
import { DashboardLayout, formatLatency, hotspotScoreClass, useRepoData } from '../../../lib/dashboard';
import { Icon } from '../../../components/Icon';

function reviewStatusClass(status: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (s.includes('fail') || s.includes('error')) return 'status-badge--fail';
  if (s.includes('warn') || s.includes('review')) return 'status-badge--warn';
  if (s.includes('pass') || s.includes('complete') || s.includes('merge')) return 'status-badge--success';
  return 'status-badge--muted';
}

function outcomeIconName(outcome: string | null): string {
  switch (outcome) {
    case 'PASS':
      return 'check_circle';
    case 'FAIL':
      return 'cancel';
    case 'WARN':
      return 'warning';
    default:
      return 'pending';
  }
}

export default function OverviewPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { pulls, analytics, hotspots, error, loading } = useRepoData(repoId);
  const base = repoId ? `/dashboard/${repoId}` : '';

  return (
    <DashboardLayout activeNav="overview">
      <div className="canvas-inner">
        {error ? <div className="error-banner">{error}</div> : null}
        {loading ? <p className="empty-state">Loading repository data…</p> : null}

        <div className="quick-actions">
          <Link href={`${base}/ask`} className="btn-primary">
            <Icon name="bolt" size={16} />
            Ask a question
          </Link>
          <Link href={`${base}/search`} className="btn-secondary">
            <Icon name="search" size={16} />
            Search code
          </Link>
        </div>

        {analytics ? (
          <div className="kpi-grid">
            <div className="kpi-tile">
              <span className="label-caps kpi-label">Total Reviews</span>
              <div>
                <span className="kpi-value">{analytics.totalReviews.toLocaleString()}</span>
              </div>
            </div>
            <div className="kpi-tile">
              <span className="label-caps kpi-label">Completed</span>
              <div>
                <span className="kpi-value">{analytics.completedReviews.toLocaleString()}</span>
              </div>
            </div>
            <div className="kpi-tile">
              <span className="label-caps kpi-label">Failed</span>
              <div>
                <span className="kpi-value kpi-value--fail">{analytics.failedReviews}</span>
                {analytics.failedReviews > 0 ? (
                  <span className="kpi-meta kpi-meta--fail">Attention</span>
                ) : null}
              </div>
            </div>
            <div className="kpi-tile">
              <span className="label-caps kpi-label">Avg Latency</span>
              <div>
                <span className="kpi-value">{formatLatency(analytics.averageReviewLatencyMs)}</span>
                <span className="kpi-meta">p95</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="bento-grid">
          <section className="panel">
            <div className="panel-header">
              <h2>Active Pull Requests</h2>
              <Link href={`${base}/pulls`} className="panel-link">
                View All
              </Link>
            </div>
            {pulls.length === 0 ? (
              <p className="empty-state" style={{ padding: 16 }}>
                No pull requests indexed yet.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>#PR</th>
                      <th>Title</th>
                      <th style={{ width: 128 }}>Status</th>
                      <th style={{ width: 96 }}>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pulls.slice(0, 6).map((pull) => (
                      <tr key={pull.pullNumber}>
                        <td className="mono">#{pull.pullNumber}</td>
                        <td>{pull.title}</td>
                        <td>
                          <span
                            className={`status-badge ${reviewStatusClass(pull.latestReviewStatus)}`}
                          >
                            <span className="status-dot" />
                            {(pull.latestReviewStatus ?? pull.status).toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Icon name={outcomeIconName(pull.latestReviewOutcome)} size={16} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Code Hotspots</h2>
              <Icon name="info" size={16} />
            </div>
            {hotspots.length === 0 ? (
              <p className="empty-state" style={{ padding: 16 }}>
                No hotspot data yet.
              </p>
            ) : (
              <div className="hotspot-list">
                {hotspots.map((hotspot) => {
                  const color = hotspotScoreClass(hotspot.score);
                  return (
                    <div key={hotspot.filePath} className="hotspot-item">
                      <div className="hotspot-row">
                        <div className="hotspot-file">
                          <Icon name="draft" size={16} />
                          <span className="mono">{hotspot.filePath}</span>
                        </div>
                        <span className="hotspot-score" style={{ color }}>
                          {hotspot.score.toFixed(0)} pts
                        </span>
                      </div>
                      <div className="hotspot-bar">
                        <div
                          className="hotspot-bar-fill"
                          style={{ width: `${Math.min(hotspot.score, 100)}%`, background: color }}
                        />
                      </div>
                      <div className="hotspot-tags">
                        {hotspot.reasons.slice(0, 2).map((reason) => (
                          <span key={reason} className="tag">
                            {reason}
                          </span>
                        ))}
                        <span className="tag">{hotspot.changeCount} changes</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
