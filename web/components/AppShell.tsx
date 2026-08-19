import {
  Bell,
  Code,
  Crosshair,
  Flame,
  Gear,
  GitPullRequest,
  Graph,
  Lightning,
  List,
  MagnifyingGlass,
  Question,
  SquaresFour,
  X
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useRouter } from 'next/router';
import { useEffect, useState, type ReactNode } from 'react';
import { indexStatusLabel, useIndexStatus } from '../lib/indexStatus';
import { IconButton } from './ui/IconButton';
import { NavItem } from './ui/NavItem';
import { RepoPicker } from './ui/RepoPicker';
import { ThemeToggle } from './ui/ThemeToggle';

export type NavKey = 'overview' | 'search' | 'ask' | 'pulls' | 'hotspots' | 'architecture' | 'impact' | 'settings';

type AppShellProps = {
  repoId: string;
  repoFullName: string;
  userLogin: string;
  userAvatar: string;
  activeNav: NavKey;
  canvasClass?: string;
  demoMode?: boolean;
  children: ReactNode;
};

const NAV: Array<{ key: NavKey; href: string; label: string; icon: Icon }> = [
  { key: 'overview', href: '', label: 'Overview', icon: SquaresFour },
  { key: 'search', href: '/search', label: 'Search', icon: MagnifyingGlass },
  { key: 'ask', href: '/ask', label: 'Ask RepoPilot', icon: Lightning },
  { key: 'pulls', href: '/pulls', label: 'Pull Requests', icon: GitPullRequest },
  { key: 'hotspots', href: '/hotspots', label: 'Hotspots', icon: Flame },
  { key: 'architecture', href: '/architecture', label: 'Architecture', icon: Graph },
  { key: 'impact', href: '/impact', label: 'Impact', icon: Crosshair },
  { key: 'settings', href: '/settings', label: 'Settings', icon: Gear }
];

export function AppShell({
  repoId,
  repoFullName,
  userLogin,
  userAvatar,
  activeNav,
  canvasClass,
  demoMode = false,
  children
}: AppShellProps) {
  const router = useRouter();
  const base = `/dashboard/${repoId}`;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const indexStatus = useIndexStatus(repoId, !demoMode);
  const indexLabel = demoMode ? 'Demo data' : indexStatusLabel(indexStatus);
  const indexPillClass = [
    'indexing-pill',
    demoMode ? 'indexing-pill--demo' : '',
    indexStatus?.state === 'failed' ? 'indexing-pill--failed' : '',
    indexStatus?.state === 'ready' ? 'indexing-pill--ready' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const pulseIdle = !demoMode && indexStatus?.state === 'ready';

  useEffect(() => {
    function close() {
      setMobileNavOpen(false);
    }
    router.events.on('routeChangeComplete', close);
    return () => {
      router.events.off('routeChangeComplete', close);
    };
  }, [router]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNavOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

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
          <IconButton
            className="mobile-nav-toggle"
            label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={20} weight="light" /> : <List size={20} weight="light" />}
          </IconButton>
          <RepoPicker repoFullName={repoFullName} />
          <div className="topbar-actions">
            <div className={indexPillClass} title={indexStatus?.job?.lastError ?? undefined}>
              <span className={`pulse-dot${pulseIdle ? ' pulse-dot--idle' : ''}`} />
              <span className="label-caps">{indexLabel}</span>
            </div>
            <ThemeToggle />
            <IconButton label="Notifications">
              <Bell size={18} weight="light" />
            </IconButton>
            <IconButton label="Help">
              <Question size={18} weight="light" />
            </IconButton>
            <img
              src={userAvatar || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
              alt=""
              className="avatar"
              width={32}
              height={32}
            />
            <button type="button" className="signout-btn" onClick={() => void handleLogout()}>
              {userLogin}
            </button>
          </div>
        </header>

        <div className={`canvas${canvasClass ? ` ${canvasClass}` : ''}`}>{children}</div>
      </div>

      {mobileNavOpen ? (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        id="mobile-nav-drawer"
        className={`mobile-nav-drawer${mobileNavOpen ? ' mobile-nav-drawer--open' : ''}`}
        aria-hidden={!mobileNavOpen}
      >
        <div className="mobile-nav-drawer__header">
          <div className="sidebar-brand mobile-nav-drawer__brand">
            <div className="brand-mark">
              <Code size={18} weight="light" aria-hidden />
            </div>
            <div>
              <div className="brand-title">RepoPilot</div>
              <div className="brand-version">v1.2.4</div>
            </div>
          </div>
          <IconButton label="Close navigation menu" onClick={() => setMobileNavOpen(false)}>
            <X size={18} weight="light" />
          </IconButton>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavItem
              key={item.key}
              href={`${base}${item.href}`}
              label={item.label}
              icon={item.icon}
              active={item.key === activeNav}
              onClick={() => setMobileNavOpen(false)}
            />
          ))}
        </nav>
      </aside>
    </div>
  );
}
