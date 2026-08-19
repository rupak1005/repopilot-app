import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell, type NavKey } from '../components/AppShell';
import type { PublicUser } from './session';
import type {
  HotspotRow,
  PullRequestRow,
  RepositoryAnalytics
} from './types';
import { API_BASE } from './types';

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
    >
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
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [pullResponse, analyticsResponse, hotspotResponse] = await Promise.all([
          fetch(`${API_BASE}/api/v1/repositories/${repoId}/pulls`),
          fetch(`${API_BASE}/api/v1/repositories/${repoId}/analytics`),
          fetch(`${API_BASE}/api/v1/repositories/${repoId}/hotspots?topK=5`)
        ]);

        if (!pullResponse.ok || !analyticsResponse.ok || !hotspotResponse.ok) {
          throw new Error(
            'Repository not indexed yet — run sync from the API/CLI, or pick a repo that has data.'
          );
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

export function formatLatency(ms: number | null): string {
  if (ms == null) return 'n/a';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function hotspotScoreClass(score: number): string {
  if (score >= 80) return 'var(--status-fail)';
  if (score >= 50) return 'var(--status-warn)';
  return 'var(--primary)';
}

export type { PublicUser };
