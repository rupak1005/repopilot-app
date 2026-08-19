import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { DifferentiatorsStrip } from '../components/ui/DifferentiatorsStrip';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { IndexProgress } from '../components/ui/IndexProgress';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';
import { EXAMPLE_REPOS } from '../lib/exampleRepos';
import { GITHUB_SIGN_IN_URL } from '../lib/auth';
import { isDemoMode } from '../lib/demoMode';
import { MARKETING_URL } from '../lib/types';

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('https://github.com/');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedInRepoId, setSignedInRepoId] = useState<string | null>(null);
  const [indexingRepo, setIndexingRepo] = useState<{ id: string; fullName: string } | null>(null);

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
    setIndexingRepo(null);
    try {
      const response = await fetch('/api/public/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input })
      });
      const data = (await response.json()) as {
        repositoryId?: string;
        fullName?: string;
        indexing?: boolean;
        error?: string;
      };
      if (!response.ok || !data.repositoryId) {
        throw new Error(data.error ?? 'Could not open repository');
      }
      if (data.indexing && !isDemoMode()) {
        setIndexingRepo({ id: data.repositoryId, fullName: data.fullName ?? input });
        setLoading(false);
        return;
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
    <PublicPageLayout
      active="home"
      pageClassName="landing-page"
      mainClassName="landing-page__main"
      shellClassName="landing-shell"
    >
          <div className="landing-card">
            {indexingRepo ? (
              <IndexProgress
                repoId={indexingRepo.id}
                fullName={indexingRepo.fullName}
                onReady={() => void router.push(`/dashboard/${indexingRepo.id}`)}
                onFailed={(message) => {
                  setError(message);
                  setIndexingRepo(null);
                }}
              />
            ) : (
              <>
                <p className="landing-eyebrow">Engineering intelligence</p>
                <h1>Repository to diagram — and beyond</h1>
                <p className="landing-lede">
                  Real architecture maps from import analysis, plus impact, hotspots, Ask, and PR
                  review — paste a URL or slug, or swap <span className="mono">hub</span> for{' '}
                  <span className="mono">pilot</span> in the hostname.
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
                        onClick={() => void openRepo(repo.slug)}
                      >
                        {repo.label}
                      </button>
                    ))}
                  </div>
                </div>

                <DifferentiatorsStrip
                  title="Why RepoPilot"
                  showTagline
                  className="diff-strip--landing"
                />

                <p className="landing-note">
                  Private repos need{' '}
                  <Link href={GITHUB_SIGN_IN_URL} className="landing-link">
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
              </>
            )}
          </div>
    </PublicPageLayout>
  );
}
