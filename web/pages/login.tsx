import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
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
      <div className="login-card">
        <h1>
          Repo<span style={{ color: 'var(--accent)' }}>Pilot</span>
        </h1>
        <p>Sign in with GitHub to pick a repository and open mission control.</p>
        {error ? <div className="error-banner">{error}</div> : null}
        <a href="/api/auth/github" className="btn btn-primary" style={{ width: '100%' }}>
          Sign in with GitHub
        </a>
        <p style={{ marginTop: 24, fontSize: 13 }}>
          <Link href={MARKETING_URL}>← Back to marketing site</Link>
        </p>
      </div>
    </main>
  );
}
