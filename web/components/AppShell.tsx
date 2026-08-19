import { Bell, Question } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { IconButton } from './ui/IconButton';
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

const NAV: Array<{ key: NavKey; href: string; label: string; icon: string }> = [
  { key: 'overview', href: '', label: 'Overview', icon: 'dashboard' },
  { key: 'search', href: '/search', label: 'Search', icon: 'search' },
  { key: 'ask', href: '/ask', label: 'Ask RepoPilot', icon: 'bolt' },
  { key: 'pulls', href: '/pulls', label: 'Pull Requests', icon: 'merge_type' },
  { key: 'hotspots', href: '/hotspots', label: 'Hotspots', icon: 'local_fire_department' },
  { key: 'settings', href: '/settings', label: 'Settings', icon: 'settings' }
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
            <Icon name="code" size={18} />
          </div>
          <div>
            <div className="brand-title">RepoPilot</div>
            <div className="brand-version">v1.2.4</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => {
            const href = `${base}${item.href}`;
            const active = item.key === activeNav;
            return (
              <Link
                key={item.key}
                href={href}
                className={`nav-link${active ? ' nav-link--active' : ''}`}
              >
                <Icon name={item.icon} size={20} filled={active && item.key === 'ask'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
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
