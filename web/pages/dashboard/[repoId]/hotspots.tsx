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
import {
  TOPO_WINDOWS,
  parseTopoWindowDays,
  scaleHotspotsForWindow,
  type TopoWindowDays
} from '../../../lib/topography';
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

  const [windowDays, setWindowDays] = useState<TopoWindowDays>(30);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [topoError, setTopoError] = useState<string | null>(null);
  const [topoLoading, setTopoLoading] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.window;
    setWindowDays(parseTopoWindowDays(Array.isArray(raw) ? raw[0] : raw));
  }, [router.isReady, router.query.window]);

  useEffect(() => {
    if (!repoId) return;
    if (isDemoMode()) {
      setHotspots(scaleHotspotsForWindow(DEMO_HOTSPOTS, windowDays));
      setTopoError(null);
      return;
    }

    let cancelled = false;
    async function load() {
      setTopoLoading(true);
      try {
        const response = await fetch(
          repoApiPath(repoId!, `hotspots?topK=40&windowDays=${windowDays}`)
        );
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
  }, [repoId, overviewHotspots, windowDays]);

  function selectWindow(days: TopoWindowDays) {
    setWindowDays(days);
    if (!repoId) return;
    void router.replace(
      { pathname: `/dashboard/${repoId}/hotspots`, query: days === 30 ? {} : { window: days } },
      undefined,
      { shallow: true }
    );
  }

  const windowLabel = windowDays === 365 ? '1 year' : `${windowDays} days`;

  return (
    <DashboardLayout activeNav="hotspots">
      <div className="canvas-inner ui-topo-page">
        <div className="ui-topo-page__header">
          <div className="page-title-block">
            <h1>Topography</h1>
            <p>
              Directory landscape sized by hotspot score — churn × dependents × findings. Click a
              cluster, then open a file for blast radius.
            </p>
          </div>
          <div className="ui-topo__windows" role="group" aria-label="Churn lookback window">
            {TOPO_WINDOWS.map((w) => (
              <button
                key={w.days}
                type="button"
                className={`ui-topo__window${windowDays === w.days ? ' ui-topo__window--active' : ''}`}
                aria-pressed={windowDays === w.days}
                onClick={() => selectWindow(w.days)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {error || topoError ? <ErrorBanner>{error ?? topoError}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}
        {loading || topoLoading ? <p className="empty-state">Loading topography…</p> : null}

        <BentoPanel
          title={`Landscape · last ${windowLabel}`}
          action={<Flame size={18} weight="fill" color="var(--status-warn)" aria-hidden />}
        >
          <TopographyMap hotspots={hotspots} repoId={repoId} />
        </BentoPanel>

        <BentoPanel title={`Ranked hotspots · ${hotspots.length}`}>
          <HotspotList
            hotspots={hotspots}
            repoId={repoId}
            ranked
            emptyMessage="No hotspot data yet — run history ingest on the API."
          />
        </BentoPanel>
      </div>
    </DashboardLayout>
  );
}
