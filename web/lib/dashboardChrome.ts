import type { NavKey } from '../components/AppShell';

export type DashboardChrome = {
  activeNav: NavKey;
  canvasClass?: string;
};

/**
 * Map Next.js `router.pathname` (with `[repoId]`) to persistent shell chrome.
 * When used from `_app`, DashboardLayout stays mounted across sidebar nav.
 */
export function resolveDashboardChrome(pathname: string): DashboardChrome | null {
  if (!pathname.startsWith('/dashboard/[repoId]')) return null;

  if (pathname === '/dashboard/[repoId]') {
    return { activeNav: 'overview' };
  }
  if (pathname === '/dashboard/[repoId]/search') return { activeNav: 'search' };
  if (pathname === '/dashboard/[repoId]/ask') {
    return { activeNav: 'ask', canvasClass: 'canvas--ask' };
  }
  if (pathname.startsWith('/dashboard/[repoId]/pulls')) return { activeNav: 'pulls' };
  if (pathname === '/dashboard/[repoId]/hotspots') return { activeNav: 'hotspots' };
  if (pathname === '/dashboard/[repoId]/architecture') {
    return { activeNav: 'architecture', canvasClass: 'canvas--diagram' };
  }
  if (pathname === '/dashboard/[repoId]/impact') return { activeNav: 'impact' };
  if (pathname === '/dashboard/[repoId]/history') return { activeNav: 'history' };
  if (pathname === '/dashboard/[repoId]/planning') return { activeNav: 'planning' };
  if (pathname === '/dashboard/[repoId]/wiki') return { activeNav: 'wiki' };
  if (pathname === '/dashboard/[repoId]/findings') return { activeNav: 'findings' };
  if (pathname === '/dashboard/[repoId]/settings') return { activeNav: 'settings' };
  if (pathname === '/dashboard/[repoId]/mcp') return { activeNav: 'mcp' };

  return { activeNav: 'overview' };
}
