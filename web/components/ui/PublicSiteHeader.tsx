import Link from 'next/link';
import { useRouter } from 'next/router';
import { Code, GithubLogo, SignOut } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { GITHUB_SIGN_IN_URL, isGitHubUser, signOut } from '../../lib/auth';
import type { PublicUser } from '../../lib/session';
import { ThemeToggle } from './ThemeToggle';

type PublicSiteHeaderProps = {
  active?: 'home' | 'browse' | 'docs' | 'login' | 'repos';
};

export function PublicSiteHeader({ active }: PublicSiteHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);

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

  const signedIn = Boolean(user);
  const hasGitHub = isGitHubUser(user);

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

      <nav className="public-header__nav" aria-label="Site">
        <Link
          href="/docs"
          className={`public-header__link${active === 'docs' ? ' public-header__link--active' : ''}`}
        >
          Docs
        </Link>
        <Link
          href="/browse"
          className={`public-header__link${active === 'browse' ? ' public-header__link--active' : ''}`}
        >
          Browse
        </Link>
        {user?.selectedRepoId ? (
          <Link href={`/dashboard/${user.selectedRepoId}`} className="public-header__link">
            Dashboard
          </Link>
        ) : hasGitHub ? (
          <Link
            href="/repos"
            className={`public-header__link${active === 'repos' ? ' public-header__link--active' : ''}`}
          >
            Repositories
          </Link>
        ) : null}
        {hasGitHub ? (
          <>
            <span className="public-header__user">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="public-header__avatar" width={24} height={24} />
              ) : null}
              <span>{user?.login}</span>
            </span>
            <button type="button" className="public-header__signout" onClick={() => void signOut('/')}>
              <SignOut size={16} weight="bold" aria-hidden />
              Log out
            </button>
          </>
        ) : (
          <Link
            href={GITHUB_SIGN_IN_URL}
            className={`public-header__cta${active === 'login' ? ' public-header__cta--active' : ''}`}
          >
            <GithubLogo size={16} weight="fill" aria-hidden />
            {signedIn ? 'Connect GitHub' : 'Sign in'}
          </Link>
        )}
        <ThemeToggle />
      </nav>
    </header>
  );
}
