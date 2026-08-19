import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Code } from '@phosphor-icons/react';
import { Button, GitHubIcon } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';
import { MARKETING_URL } from '../lib/types';
import { isGitHubUser } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const error = typeof router.query.error === 'string' ? router.query.error : null;

  useEffect(() => {
    async function check() {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = (await response.json()) as {
          selectedRepoId?: string;
          isPublicGuest?: boolean;
        };
        if (isGitHubUser(user)) {
          if (user.selectedRepoId) {
            void router.replace(`/dashboard/${user.selectedRepoId}`);
          } else {
            void router.replace('/repos');
          }
          return;
        }
      }
      setChecking(false);
    }
    void check();
  }, [router]);

  if (checking) {
    return (
      <PublicPageLayout
        active="login"
        pageClassName="login-page"
        mainClassName="login-page__main"
        shellClassName="login-shell"
      >
        <p className="empty-state">Loading…</p>
      </PublicPageLayout>
    );
  }

  return (
    <PublicPageLayout
      active="login"
      pageClassName="login-page"
      mainClassName="login-page__main"
      shellClassName="login-shell"
    >
          <div className="login-card">
            <span className="login-eyebrow">Mission control</span>
            <div className="login-mark" aria-hidden>
              <Code size={22} weight="light" />
            </div>
            <h1>Sign in for private repos</h1>
            <p>
              Connect GitHub for private repositories, or paste a public repo on the home page — no
              account required.
            </p>
            {error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <div className="login-actions">
              <Button href="/" variant="secondary" size="lg" fullWidth>
                Analyze a public repo
              </Button>
              <Button href="/api/auth/github" variant="primary" size="lg" fullWidth icon={<GitHubIcon />}>
                Sign in with GitHub
              </Button>
            </div>
            <p className="login-footer">
              <Link href="/browse">Browse public repos</Link>
              <span aria-hidden> · </span>
              <Link href={MARKETING_URL}>Marketing site</Link>
            </p>
          </div>
    </PublicPageLayout>
  );
}
