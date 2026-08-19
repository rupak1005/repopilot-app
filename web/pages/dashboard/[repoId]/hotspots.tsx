import { useRouter } from 'next/router';
import { DashboardLayout, useRepoData } from '../../../lib/dashboard';

export default function HotspotsPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { hotspots, error, loading } = useRepoData(repoId);

  return (
    <DashboardLayout title="Hotspots" subtitle="Files with the highest change churn.">
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="empty-state">Loading hotspots…</p> : null}
      <section className="card">
        {hotspots.length === 0 ? (
          <p className="empty-state">No hotspot data yet — run history ingest on the API.</p>
        ) : (
          <ul className="hit-list">
            {hotspots.map((hotspot) => (
              <li key={hotspot.filePath}>
                <strong>{hotspot.filePath}</strong>
                <div className="hit-meta">
                  Score {hotspot.score.toFixed(1)} · {hotspot.changeCount} changes
                </div>
                {hotspot.reasons.length > 0 ? (
                  <p className="hit-snippet">{hotspot.reasons.join(' · ')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardLayout>
  );
}
