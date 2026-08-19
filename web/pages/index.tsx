import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PublicSiteHeader } from '../components/ui/PublicSiteHeader';
import { EXAMPLE_REPOS, githubUrl } from '../lib/exampleRepos';
import { isDemoMode } from '../lib/demoMode';
import { MARKETING_URL } from '../lib/types';

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('https://github.com/');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedInRepoId, setSignedInRepoId] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return;
      const user = (await response.json()) as { selectedRepoId?: string };
      if (user.selectedRepoId) setSignedInRepoId(user.selectedRepoId);
    }
    void checkSession();
  }, []);

  async function openRepo(input: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/public/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input })
      });
      const data = (await response.json()) as { repositoryId?: string; error?: string };
      if (!response.ok || !data.repositoryId) {
        throw new Error(data.error ?? 'Could not open repository');
      }
      void router.push(`/dashboard/${data.repositoryId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await openRepo(url);
  }

  return (
    <div className="landing-page">
      <PublicSiteHeader active="home" />
      <main className="landing-page__main">
        <div className="landing-shell">
          <Sparkle className="neo-sparkle" size={22} weight="fill" aria-hidden />
          <Sparkle className="neo-sparkle neo-sparkle--alt" size={16} weight="fill" aria-hidden />

          <div className="landing-card">
            <p className="landing-eyebrow">Public preview</p>
            <h1>Repository to diagram</h1>
            <p className="landing-lede">
              Turn any public GitHub repository into an interactive architecture map, impact
              analysis, and code search — or paste a slug below.
            </p>

            <form className="landing-form" onSubmit={(event) => void handleSubmit(event)}>
              <label className="ui-field-label" htmlFor="github-url">
                GitHub repository
              </label>
              <div className="landing-form__row">
                <input
                  id="github-url"
                  className="ui-input"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="owner/repo or GitHub URL"
                  spellCheck={false}
                  autoFocus
                />
                <Button type="submit" variant="primary" size="lg" disabled={loading || !url.trim()}>
                  {loading ? 'Analyzing…' : 'Analyze'}
                </Button>
              </div>
              {error ? <ErrorBanner>{error}</ErrorBanner> : null}
            </form>

            <div className="landing-examples">
              <p className="landing-examples__label">Try these example repositories:</p>
              <div className="landing-examples__chips">
                {EXAMPLE_REPOS.map((repo) => (
                  <button
                    key={repo.slug}
                    type="button"
                    className="landing-chip"
                    disabled={loading}
                    onClick={() => void openRepo(githubUrl(repo.slug))}
                  >
                    {repo.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="landing-note">
              Private repos need{' '}
              <Link href="/login" className="landing-link">
                GitHub sign-in
              </Link>
              .{' '}
              {isDemoMode()
                ? 'Demo mode uses fixtures after paste.'
                : 'First run may take a minute while we clone and index.'}
            </p>

            {signedInRepoId ? (
              <div className="landing-signed-in">
                <Link href={`/dashboard/${signedInRepoId}`} className="landing-link">
                  Continue to dashboard →
                </Link>
              </div>
            ) : null}

            <p className="landing-footer">
              <Link href="/browse">Browse public repos</Link>
              <span aria-hidden> · </span>
              <Link href={MARKETING_URL}>Marketing site</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
