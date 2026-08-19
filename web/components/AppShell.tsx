import {
  Bell,
  Code,
  Flame,
  Gear,
  GitPullRequest,
  Lightning,
  MagnifyingGlass,
  Question,
  SquaresFour
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { IconButton } from './ui/IconButton';
import { NavItem } from './ui/NavItem';
import { RepoPicker } from './ui/RepoPicker';

export type NavKey = 'overview' | 'search' | 'ask' | 'pulls' | 'hotspots' | 'settings';

type AppShellProps = {
  repoId: string;
  repoFullName: string;
  userLogin: string;
  userAvatar: string;
  activeNav: NavKey;
  canvasClass?: string;
  children: ReactNode;
};

const NAV: Array<{ key: NavKey; href: string; label: string; icon: Icon }> = [
  { key: 'overview', href: '', label: 'Overview', icon: SquaresFour },
  { key: 'search', href: '/search', label: 'Search', icon: MagnifyingGlass },
  { key: 'ask', href: '/ask', label: 'Ask RepoPilot', icon: Lightning },
  { key: 'pulls', href: '/pulls', label: 'Pull Requests', icon: GitPullRequest },
  { key: 'hotspots', href: '/hotspots', label: 'Hotspots', icon: Flame },
  { key: 'settings', href: '/settings', label: 'Settings', icon: Gear }
];

export function AppShell({
  repoId,
  repoFullName,
  userLogin,
  userAvatar,
  activeNav,
  canvasClass,
  children
}: AppShellProps) {
  const router = useRouter();
  const base = `/dashboard/${repoId}`;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    void router.push('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Code size={18} weight="light" aria-hidden />
          </div>
          <div>
            <div className="brand-title">RepoPilot</div>
            <div className="brand-version">v1.2.4</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavItem
              key={item.key}
              href={`${base}${item.href}`}
              label={item.label}
              icon={item.icon}
              active={item.key === activeNav}
            />
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <RepoPicker repoFullName={repoFullName} />
          <div className="topbar-actions">
            <div className="indexing-pill">
              <span className="pulse-dot" />
              <span className="label-caps">Indexing</span>
            </div>
            <IconButton label="Notifications">
              <Bell size={18} weight="light" />
            </IconButton>
            <IconButton label="Help">
              <Question size={18} weight="light" />
            </IconButton>
            <img src={userAvatar} alt="" className="avatar" width={32} height={32} />
            <button type="button" className="signout-btn" onClick={() => void handleLogout()}>
              {userLogin}
            </button>
          </div>
        </header>

        <div className={`canvas${canvasClass ? ` ${canvasClass}` : ''}`}>{children}</div>
      </div>
    </div>
  );
}
