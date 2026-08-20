import { Flame } from '@phosphor-icons/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { HotspotList } from '../../../components/ui/HotspotList';
import { IndexHint } from '../../../components/ui/IndexHint';
import { TopographyMap } from '../../../components/ui/TopographyMap';
import {
  DashboardLayout,
  shouldShowIndexHint,
  usePendingIndexJobRepoId,
  useRepoData,
  useRepoIndexStatus
} from '../../../lib/dashboard';
import { isDemoMode } from '../../../lib/demoMode';
import { DEMO_HOTSPOTS } from '../../../lib/demoData';
import { repoApiPath } from '../../../lib/serverApi';
import type { HotspotRow } from '../../../lib/types';

export default function HotspotsPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { hotspots: overviewHotspots, analytics, pulls, error, loading } = useRepoData(repoId);
  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const needsIndex = shouldShowIndexHint(
    pulls,
    overviewHotspots,
    analytics,
    indexStatus,
    repoId,
    pendingIndexJobRepoId
  );

  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [topoError, setTopoError] = useState<string | null>(null);
  const [topoLoading, setTopoLoading] = useState(false);

  useEffect(() => {
    if (!repoId) return;
    if (isDemoMode()) {
      setHotspots(DEMO_HOTSPOTS);
      setTopoError(null);
      return;
    }

    let cancelled = false;
    async function load() {
      setTopoLoading(true);
      try {
        const response = await fetch(repoApiPath(repoId!, 'hotspots?topK=40'));
        if (!response.ok) throw new Error('Could not load topography hotspots');
        const data = (await response.json()) as HotspotRow[];
        if (!cancelled) {
          setHotspots(data);
          setTopoError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setTopoError(err instanceof Error ? err.message : 'Failed to load hotspots');
          setHotspots(overviewHotspots);
        }
      } finally {
        if (!cancelled) setTopoLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoId, overviewHotspots]);

  return (
    <DashboardLayout activeNav="hotspots">
      <div className="canvas-inner">
        <div className="page-title-block">
          <h1>Topography</h1>
          <p>
            Engineering landscape from real hotspot scores — directory clusters sized by churn ×
            dependents × findings. Open a file for blast radius.
          </p>
        </div>

        {error || topoError ? <ErrorBanner>{error ?? topoError}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}
        {loading || topoLoading ? <p className="empty-state">Loading topography…</p> : null}

        <BentoPanel
          title="2D landscape"
          action={<Flame size={18} weight="fill" color="var(--status-warn)" aria-hidden />}
        >
          <TopographyMap hotspots={hotspots} repoId={repoId} />
        </BentoPanel>

        <BentoPanel title={`Ranked hotspots (${hotspots.length})`}>
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
