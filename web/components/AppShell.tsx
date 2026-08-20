import Link from 'next/link';
import {
  Code,
  GithubLogo,
  List,
  MagnifyingGlass,
  X
} from '@phosphor-icons/react';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MAIN_CONTENT_ID, firstFocusable } from '../lib/a11y';
import { indexStatusLabel, isRepoIndexInProgress, useAnimatedIndexProgress, useIndexStatus } from '../lib/indexStatus';
import { useIndexProgressUi } from '../lib/indexProgressUi';
import { GITHUB_SIGN_IN_URL, signOut } from '../lib/auth';
import { NAV_GROUPS } from '../lib/shellNav';
import type { NavKey } from '../lib/shellChrome';
import { CommandPalette } from './ui/CommandPalette';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { IconButton } from './ui/IconButton';
import { NavItem } from './ui/NavItem';
import { OfflineBanner } from './ui/OfflineBanner';
import { StaleIndexBanner } from './ui/StaleIndexBanner';
import { RepoPicker } from './ui/RepoPicker';
import { SkipLink } from './ui/SkipLink';
import { ThemeToggle } from './ui/ThemeToggle';
import { TopbarActivity } from './ui/TopbarActivity';
import { TopbarHelp } from './ui/TopbarHelp';

export type { NavKey };

type AppShellProps = {
  repoId: string;
  repoFullName: string;
  userLogin: string;
  userAvatar: string;
  activeNav: NavKey;
  canvasClass?: string;
  demoMode?: boolean;
  isPublicGuest?: boolean;
  children: ReactNode;
};

function renderNav(base: string, activeNav: NavKey, onNavigate?: () => void) {
  return NAV_GROUPS.map((group) => (
    <div key={group.id} className="sidebar-nav-group">
      {group.label ? <p className="sidebar-nav-group__label label-caps">{group.label}</p> : null}
      {group.items.map((item) => (
        <NavItem
          key={item.key}
          href={item.absolute ? item.href : `${base}${item.href}`}
          label={item.label}
          icon={item.icon}
          active={item.key === activeNav}
          onClick={onNavigate}
        />
      ))}
    </div>
  ));
}

export function AppShell({
  repoId,
  repoFullName,
  userLogin,
  userAvatar,
  activeNav,
  canvasClass,
  demoMode = false,
  isPublicGuest = false,
  children
}: AppShellProps) {
  const router = useRouter();
  const base = `/dashboard/${repoId}`;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const indexStatus = useIndexStatus(repoId, !demoMode, 1500);
  const indexDisplayPercent = useAnimatedIndexProgress(indexStatus);
  const { startIndexProgress, job } = useIndexProgressUi();
  const indexInProgress = isRepoIndexInProgress(repoId, indexStatus, job?.repoId);
  const indexLabel =
    demoMode
      ? 'Demo data'
      : indexInProgress && indexStatus?.state !== 'indexing'
        ? 'Indexing…'
        : indexStatusLabel(indexStatus, indexDisplayPercent);
  const indexPillClass = [
    'indexing-pill',
    demoMode ? 'indexing-pill--demo' : '',
    indexStatus?.state === 'failed' ? 'indexing-pill--failed' : '',
    indexStatus?.state === 'ready' && !indexInProgress ? 'indexing-pill--ready' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const pulseIdle = !demoMode && indexStatus?.state === 'ready' && !indexInProgress;
  const revisionShort = indexStatus?.revisionSha?.slice(0, 7) ?? null;

  useEffect(() => {
    if (demoMode || !indexStatus || indexStatus.state !== 'indexing') return;
    if (job?.repoId === repoId) return;
    startIndexProgress({ repoId, fullName: repoFullName });
  }, [demoMode, indexStatus, repoId, repoFullName, job?.repoId, startIndexProgress]);

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
    const focusTarget = firstFocusable(mobileDrawerRef.current) ?? mobileDrawerRef.current;
    window.setTimeout(() => focusTarget?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      mobileNavToggleRef.current?.focus();
    };
  }, [mobileNavOpen]);

  async function handleLogout() {
    await signOut('/');
  }

  function openCommandPalette() {
    window.dispatchEvent(new Event('rp:open-command-palette'));
  }

  return (
    <div className="app-shell">
      <SkipLink />
      <aside className="sidebar">
        <Link href="/" className="sidebar-brand">
          <div className="brand-mark">
            <Code size={18} weight="light" aria-hidden />
          </div>
          <div>
            <div className="brand-title">RepoPilot</div>
            <div className="brand-version">Technical Intelligence</div>
          </div>
        </Link>

        <nav className="sidebar-nav" aria-label="Primary">
          {renderNav(base, activeNav)}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <IconButton
            ref={mobileNavToggleRef}
            className="mobile-nav-toggle"
            label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={20} weight="light" /> : <List size={20} weight="light" />}
          </IconButton>
          <RepoPicker repoId={repoId} repoFullName={repoFullName} isPublicGuest={isPublicGuest} />
          <div className="topbar-actions">
            {isPublicGuest ? (
              <Link href={GITHUB_SIGN_IN_URL} className="topbar-signin topbar-signin--compact">
                <GithubLogo size={16} weight="fill" aria-hidden />
                <span className="topbar-signin__label">Connect GitHub</span>
              </Link>
            ) : null}
            <button type="button" className="topbar-command" onClick={openCommandPalette}>
              <MagnifyingGlass size={14} weight="bold" aria-hidden />
              <span className="topbar-command__label">Commands</span>
              <kbd className="topbar-command__kbd">⌘K</kbd>
            </button>
            <div
              className={indexPillClass}
              title={indexStatus?.job?.lastError ?? undefined}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className={`pulse-dot${pulseIdle ? ' pulse-dot--idle' : ''}`} aria-hidden />
              <span className="label-caps">{indexLabel}</span>
            </div>
            <ThemeToggle />
            <TopbarActivity
              repoId={repoId}
              repoFullName={repoFullName}
              indexStatus={demoMode ? null : indexStatus}
            />
            <TopbarHelp activeNav={activeNav} />
            {!isPublicGuest ? (
              <div className="topbar-account topbar-hide-sm">
                <img
                  src={userAvatar || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
                  alt=""
                  className="avatar"
                  width={32}
                  height={32}
                />
                <span className="topbar-user">{userLogin}</span>
                <button type="button" className="signout-btn" onClick={() => void handleLogout()}>
                  Log out
                </button>
              </div>
            ) : (
              <span className="topbar-guest label-caps topbar-hide-sm">Guest preview</span>
            )}
          </div>
        </header>

        <div className="repo-context-bar" aria-label="Repository context">
          <span className="repo-context-bar__repo mono">{repoFullName || 'Repository'}</span>
          <span className="repo-context-bar__sep" aria-hidden>
            ·
          </span>
          <span className="repo-context-bar__rev mono" title={indexStatus?.revisionSha ?? undefined}>
            {demoMode ? 'demo' : revisionShort ? `rev ${revisionShort}` : 'rev —'}
          </span>
          <span className="repo-context-bar__sep" aria-hidden>
            ·
          </span>
          <span className="repo-context-bar__status">{indexLabel}</span>
        </div>

        <main
          id={MAIN_CONTENT_ID}
          className={`canvas${canvasClass ? ` ${canvasClass}` : ''}`}
          tabIndex={-1}
        >
          <OfflineBanner />
          <StaleIndexBanner repoId={repoId} status={demoMode ? null : indexStatus} demoMode={demoMode} />
          <ErrorBoundary name={`nav:${activeNav}`}>
            {children}
          </ErrorBoundary>
        </main>
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
        ref={mobileDrawerRef}
        id="mobile-nav-drawer"
        className={`mobile-nav-drawer${mobileNavOpen ? ' mobile-nav-drawer--open' : ''}`}
        aria-hidden={!mobileNavOpen}
        inert={!mobileNavOpen ? true : undefined}
      >
        <div className="mobile-nav-drawer__header">
          <Link href="/" className="sidebar-brand mobile-nav-drawer__brand">
            <div className="brand-mark">
              <Code size={18} weight="light" aria-hidden />
            </div>
            <div>
              <div className="brand-title">RepoPilot</div>
              <div className="brand-version">Technical Intelligence</div>
            </div>
          </Link>
          <IconButton label="Close navigation menu" onClick={() => setMobileNavOpen(false)}>
            <X size={18} weight="light" />
          </IconButton>
        </div>
        <nav className="sidebar-nav" aria-label="Primary">
          {renderNav(base, activeNav, () => setMobileNavOpen(false))}
        </nav>
        <div className="mobile-nav-drawer__footer">
          <div className={indexPillClass} title={indexStatus?.job?.lastError ?? undefined}>
            <span className={`pulse-dot${pulseIdle ? ' pulse-dot--idle' : ''}`} />
            <span className="label-caps">{indexLabel}</span>
          </div>
          {!isPublicGuest ? (
            <div className="mobile-nav-drawer__account">
              <img
                src={userAvatar || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
                alt=""
                className="avatar"
                width={32}
                height={32}
              />
              <div className="mobile-nav-drawer__account-meta">
                <span className="topbar-user">{userLogin}</span>
                <button type="button" className="signout-btn" onClick={() => void handleLogout()}>
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <Link href={GITHUB_SIGN_IN_URL} className="topbar-signin" onClick={() => setMobileNavOpen(false)}>
              <GithubLogo size={16} weight="fill" aria-hidden />
              Connect GitHub
            </Link>
          )}
        </div>
      </aside>

      <CommandPalette repoId={repoId} />
    </div>
  );
}
