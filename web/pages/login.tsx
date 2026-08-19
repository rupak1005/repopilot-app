import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button, GitHubIcon } from '../components/ui/Button';
import { MARKETING_URL } from '../lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const error = typeof router.query.error === 'string' ? router.query.error : null;

  useEffect(() => {
    async function check() {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        void router.replace('/');
        return;
      }
      setChecking(false);
    }
    void check();
  }, [router]);

  if (checking) {
    return (
      <main className="login-page">
        <p className="empty-state">Loading…</p>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <div className="login-card">
          <span className="login-eyebrow">Mission control</span>
          <div className="login-mark" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>RepoPilot</h1>
          <p>Sign in with GitHub to pick a repository and open your codebase dashboard.</p>
          {error ? <div className="error-banner">{error}</div> : null}
          <Button href="/api/auth/github" variant="primary" size="lg" fullWidth icon={<GitHubIcon />}>
            Sign in with GitHub
          </Button>
          <p className="login-footer">
            <Link href={MARKETING_URL}>← Back to marketing site</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
