import { Flame } from '@phosphor-icons/react';
import { useRouter } from 'next/router';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { HotspotList } from '../../../components/ui/HotspotList';
import { IndexHint } from '../../../components/ui/IndexHint';
import { DashboardLayout, shouldShowIndexHint, usePendingIndexJobRepoId, useRepoData, useRepoIndexStatus } from '../../../lib/dashboard';

export default function HotspotsPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { hotspots, analytics, pulls, error, loading } = useRepoData(repoId);
  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const needsIndex = shouldShowIndexHint(
    pulls,
    hotspots,
    analytics,
    indexStatus,
    repoId,
    pendingIndexJobRepoId
  );

  return (
    <DashboardLayout activeNav="hotspots">
      <div className="canvas-inner">
        <div className="page-title-block">
          <h1>Hotspots</h1>
          <p>
            Ranked by churn, dependents, co-change, and review findings — not change count
            alone. Open a file to see blast radius.
          </p>
        </div>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}
        {loading ? <p className="empty-state">Loading hotspots…</p> : null}

        <BentoPanel
          title="Code Hotspots"
          action={<Flame size={18} weight="fill" color="var(--status-warn)" aria-hidden />}
        >
          <HotspotList
            hotspots={hotspots}
            repoId={repoId}
            emptyMessage="No hotspot data yet — run history ingest on the API."
          />
        </BentoPanel>
      </div>
    </DashboardLayout>
  );
}
