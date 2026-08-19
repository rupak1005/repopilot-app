import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { MARKETING_URL } from '../lib/types';

type AppShellProps = {
  repoId: string;
  repoFullName: string;
  userLogin: string;
  userAvatar: string;
  children: ReactNode;
};

const NAV = [
  { href: '', label: 'Overview' },
  { href: '/search', label: 'Search' },
  { href: '/ask', label: 'Ask' },
  { href: '/pulls', label: 'Pull Requests' },
  { href: '/hotspots', label: 'Hotspots' },
  { href: '/settings', label: 'Settings' }
] as const;

export function AppShell({
  repoId,
  repoFullName,
  userLogin,
  userAvatar,
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
          Repo<span>Pilot</span>
        </div>
        <div className="sidebar-sub">Mission control</div>

        <div className="sidebar-repo">
          <span>Repository</span>
          <strong>{repoFullName}</strong>
        </div>

        <nav>
          <ul className="nav-list">
            {NAV.map((item) => {
              const href = `${base}${item.href}`;
              const active =
                item.href === ''
                  ? router.pathname === '/dashboard/[repoId]'
                  : router.pathname.endsWith(item.href);
              return (
                <li key={item.href}>
                  <Link href={href} className={active ? 'active' : undefined}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-row">
            <img src={userAvatar} alt="" width={32} height={32} />
            <span>{userLogin}</span>
          </div>
          <Link href="/repos">Switch repo</Link>
          {' · '}
          <button type="button" className="btn-ghost" onClick={() => void handleLogout()} style={{ border: 'none', padding: 0, background: 'none', color: 'var(--text-muted)', fontSize: 13 }}>
            Sign out
          </button>
          <div style={{ marginTop: 12 }}>
            <a href={MARKETING_URL}>Marketing site</a>
          </div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
