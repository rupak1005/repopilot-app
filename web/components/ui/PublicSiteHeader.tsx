import Link from 'next/link';
import { useRouter } from 'next/router';
import { Code, GithubLogo, List, SignOut, X } from '@phosphor-icons/react';
import { useEffect, useId, useState } from 'react';
import { GITHUB_SIGN_IN_URL, isGitHubUser, signOut } from '../../lib/auth';
import type { PublicUser } from '../../lib/session';
import { ThemeToggle } from './ThemeToggle';

type PublicSiteHeaderProps = {
  active?: 'home' | 'browse' | 'docs' | 'login' | 'repos';
};

export function PublicSiteHeader({ active }: PublicSiteHeaderProps) {
  const router = useRouter();
  const menuId = useId();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        setUser(null);
        return;
      }
      setUser((await response.json()) as PublicUser);
    }
    void load();
  }, [router.asPath]);

  useEffect(() => {
    setMenuOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const signedIn = Boolean(user);
  const hasGitHub = isGitHubUser(user);

  const navLinks = (
    <>
      <Link
        href="/docs"
        className={`public-header__link${active === 'docs' ? ' public-header__link--active' : ''}`}
        onClick={() => setMenuOpen(false)}
      >
        Docs
      </Link>
      <Link
        href="/browse"
        className={`public-header__link${active === 'browse' ? ' public-header__link--active' : ''}`}
        onClick={() => setMenuOpen(false)}
      >
        Browse
      </Link>
      {user?.selectedRepoId ? (
        <Link
          href={`/dashboard/${user.selectedRepoId}`}
          className="public-header__link"
          onClick={() => setMenuOpen(false)}
        >
          Dashboard
        </Link>
      ) : hasGitHub ? (
        <Link
          href="/repos"
          className={`public-header__link${active === 'repos' ? ' public-header__link--active' : ''}`}
          onClick={() => setMenuOpen(false)}
        >
          Repositories
        </Link>
      ) : null}
    </>
  );

  return (
    <header className="public-header">
      <Link href="/" className="public-header__brand">
        <span className="public-header__mark" aria-hidden>
          <Code size={20} weight="light" />
        </span>
        <span className="public-header__title">
          Repo<span className="public-header__accent">Pilot</span>
        </span>
      </Link>

      <nav className="public-header__nav public-header__nav--desktop" aria-label="Site">
        {navLinks}
        {hasGitHub ? (
          <>
            <span className="public-header__user">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="public-header__avatar" width={24} height={24} />
              ) : null}
              <span className="public-header__login">{user?.login}</span>
            </span>
            <button type="button" className="public-header__signout" onClick={() => void signOut('/')}>
              <SignOut size={16} weight="bold" aria-hidden />
              <span className="public-header__signout-label">Log out</span>
            </button>
          </>
        ) : (
          <Link
            href={GITHUB_SIGN_IN_URL}
            className={`public-header__cta${active === 'login' ? ' public-header__cta--active' : ''}`}
          >
            <GithubLogo size={16} weight="fill" aria-hidden />
            <span className="public-header__cta-label">{signedIn ? 'Connect GitHub' : 'Sign in'}</span>
          </Link>
        )}
        <ThemeToggle />
      </nav>

      <div className="public-header__mobile-actions">
        <ThemeToggle />
        <button
          type="button"
          className="public-header__menu-btn"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} weight="bold" aria-hidden /> : <List size={20} weight="bold" aria-hidden />}
        </button>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="public-header__menu-backdrop"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div id={menuId} className="public-header__menu" role="dialog" aria-label="Site menu">
            <nav className="public-header__menu-nav" aria-label="Site">
              {navLinks}
            </nav>
            <div className="public-header__menu-footer">
              {hasGitHub ? (
                <>
                  <span className="public-header__user">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="public-header__avatar"
                        width={28}
                        height={28}
                      />
                    ) : null}
                    <span>{user?.login}</span>
                  </span>
                  <button
                    type="button"
                    className="public-header__signout"
                    onClick={() => void signOut('/')}
                  >
                    <SignOut size={16} weight="bold" aria-hidden />
                    Log out
                  </button>
                </>
              ) : (
                <Link
                  href={GITHUB_SIGN_IN_URL}
                  className="public-header__cta"
                  onClick={() => setMenuOpen(false)}
                >
                  <GithubLogo size={16} weight="fill" aria-hidden />
                  {signedIn ? 'Connect GitHub' : 'Sign in'}
                </Link>
              )}
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
