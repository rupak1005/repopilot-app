import Link from 'next/link';
import { useRouter } from 'next/router';
import { Code, GithubLogo } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

type PublicSiteHeaderProps = {
  active?: 'home' | 'browse' | 'login';
};

export function PublicSiteHeader({ active }: PublicSiteHeaderProps) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [repoId, setRepoId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return;
      const user = (await response.json()) as { selectedRepoId?: string };
      setSignedIn(true);
      setRepoId(user.selectedRepoId ?? null);
    }
    void load();
  }, [router.asPath]);

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
          href="/browse"
          className={`public-header__link${active === 'browse' ? ' public-header__link--active' : ''}`}
        >
          Browse
        </Link>
        {signedIn ? (
          <Link
            href={repoId ? `/dashboard/${repoId}` : '/repos'}
            className="public-header__link public-header__link--cta"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            className={`public-header__link public-header__link--cta${active === 'login' ? ' public-header__link--active' : ''}`}
          >
            <GithubLogo size={16} weight="fill" aria-hidden />
            Sign in
          </Link>
        )}
        <ThemeToggle variant="pill" />
      </nav>
    </header>
  );
}
