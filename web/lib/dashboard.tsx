import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell, type NavKey } from '../components/AppShell';
import { SeoHead } from '../components/ui/SeoHead';
import type { PublicUser } from './session';
import type {
  HotspotRow,
  PullRequestRow,
  RepositoryAnalytics
} from './types';
import { repoApiPath } from './serverApi';
import { DemoBanner } from '../components/ui/DemoBanner';
import { PublicGuestBanner } from '../components/ui/PublicGuestBanner';
import { IndexHint } from '../components/ui/IndexHint';
import {
  DEMO_ANALYTICS,
  DEMO_HOTSPOTS,
  DEMO_PULLS
} from './demoData';
import { isDemoMode } from './demoMode';
import { useIndexStatus } from './indexStatus';
import { useIndexProgressUi } from './indexProgressUi';
import { formatLatency } from './metrics';

type DashboardContext = {
  repoId: string;
  repoFullName: string;
  user: PublicUser;
};

export function useDashboardContext(): DashboardContext | null {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        void router.replace('/login');
        return;
      }
      setUser((await response.json()) as PublicUser);
    }
    void load();
  }, [router]);

  if (!repoId || !user) return null;

  const repoFullName = user.selectedRepoFullName ?? repoId;
  return { repoId, repoFullName, user };
}

const DASHBOARD_TITLES: Record<NavKey, string> = {
  overview: 'Overview',
  search: 'Search',
  ask: 'Ask',
  pulls: 'Pull requests',
  hotspots: 'Topography',
  architecture: 'Dependency Graph',
  impact: 'Impact',
  history: 'History',
  settings: 'Settings',
  mcp: 'MCP'
};

type DashboardLayoutProps = {
  activeNav: NavKey;
  canvasClass?: string;
  children: React.ReactNode;
};

export function DashboardLayout({ activeNav, canvasClass, children }: DashboardLayoutProps) {
  const ctx = useDashboardContext();
  if (!ctx) {
    return (
      <main className="standalone-page">
        <SeoHead title="Dashboard" path="/dashboard" noIndex />
        <p className="empty-state">Loading…</p>
      </main>
    );
  }

  return (
    <AppShell
      repoId={ctx.repoId}
      repoFullName={ctx.repoFullName}
      userLogin={ctx.user.login}
      userAvatar={ctx.user.avatarUrl}
      activeNav={activeNav}
      canvasClass={canvasClass}
      demoMode={isDemoMode()}
      isPublicGuest={ctx.user.isPublicGuest}
    >
      <SeoHead
        title={`${DASHBOARD_TITLES[activeNav]} · ${ctx.repoFullName}`}
        description={`Indexed view of ${ctx.repoFullName} in RepoPilot.`}
        path={`/dashboard/${ctx.repoId}`}
        noIndex
      />
      {isDemoMode() ? <DemoBanner /> : null}
      {ctx.user.isPublicGuest && !isDemoMode() ? <PublicGuestBanner /> : null}
      {children}
    </AppShell>
  );
}

export function useRepoData(repoId: string | null) {
  const [pulls, setPulls] = useState<PullRequestRow[]>([]);
  const [analytics, setAnalytics] = useState<RepositoryAnalytics | null>(null);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repoId) return;
    const activeRepoId = repoId;

    if (isDemoMode()) {
      setPulls(DEMO_PULLS);
      setAnalytics(DEMO_ANALYTICS);
      setHotspots(DEMO_HOTSPOTS);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [pullResponse, analyticsResponse, hotspotResponse] = await Promise.all([
          fetch(repoApiPath(activeRepoId, 'pulls')),
          fetch(repoApiPath(activeRepoId, 'analytics')),
          fetch(repoApiPath(activeRepoId, 'hotspots?topK=5'))
        ]);

        if (!pullResponse.ok || !analyticsResponse.ok || !hotspotResponse.ok) {
          throw new Error('Could not reach the API — is it running on port 3001?');
        }

        if (!cancelled) {
          setPulls((await pullResponse.json()) as PullRequestRow[]);
          setAnalytics((await analyticsResponse.json()) as RepositoryAnalytics);
          setHotspots((await hotspotResponse.json()) as HotspotRow[]);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  return { pulls, analytics, hotspots, error, loading };
}

export { shouldShowIndexHint, showIndexHint } from './indexHint';

export function usePendingIndexJobRepoId(): string | null {
  const { job } = useIndexProgressUi();
  return job?.repoId ?? null;
}

export function useRepoIndexStatus(repoId: string | null) {
  return useIndexStatus(repoId, !isDemoMode(), 1500);
}

export { formatLatency };

export type { PublicUser };
