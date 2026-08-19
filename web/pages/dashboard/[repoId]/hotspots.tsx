import { useRouter } from 'next/router';
import { DashboardLayout, hotspotScoreClass, useRepoData } from '../../../lib/dashboard';
import { Icon } from '../../../components/Icon';

export default function HotspotsPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { hotspots, error, loading } = useRepoData(repoId);

  return (
    <DashboardLayout activeNav="hotspots">
      <div className="canvas-inner">
        <div className="page-title-block">
          <h1>Hotspots</h1>
          <p>Files with the highest change churn.</p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {loading ? <p className="empty-state">Loading hotspots…</p> : null}

        <section className="panel">
          <div className="panel-header">
            <h2>Code Hotspots</h2>
            <Icon name="local_fire_department" size={16} />
          </div>
          {hotspots.length === 0 ? (
            <p className="empty-state" style={{ padding: 16 }}>
              No hotspot data yet — run history ingest on the API.
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
                        {hotspot.score.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="hotspot-bar">
                      <div
                        className="hotspot-bar-fill"
                        style={{ width: `${Math.min(hotspot.score, 100)}%`, background: color }}
                      />
                    </div>
                    {hotspot.reasons.length > 0 ? (
                      <div className="hotspot-tags">
                        {hotspot.reasons.map((reason) => (
                          <span key={reason} className="tag">
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
