import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { DifferentiatorsStrip } from '../components/ui/DifferentiatorsStrip';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';
import { parseGithubRepoUrl } from '@repopilot/common';
import { EXAMPLE_REPOS, githubUrl } from '../lib/exampleRepos';
import { GITHUB_SIGN_IN_URL } from '../lib/auth';
import { isDemoMode } from '../lib/demoMode';
import { useIndexProgressUi } from '../lib/indexProgressUi';
import {
  LANDING_BRAND,
  LANDING_HEADLINE,
  LANDING_HOW_IT_WORKS,
  LANDING_LEDE
} from '../lib/landing';
import { apiUnreachableMessage, parseJsonResponse } from '../lib/parseJsonResponse';
import { MARKETING_URL } from '../lib/types';
import { DEFAULT_DESCRIPTION, siteJsonLd } from '../lib/seo';

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('https://github.com/');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedInRepoId, setSignedInRepoId] = useState<string | null>(null);
  const { startIndexProgress } = useIndexProgressUi();

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
      if (!parseGithubRepoUrl(input)) {
        throw new Error('Paste a public GitHub URL or owner/repo slug.');
      }
      const response = await fetch('/api/public/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input })
      });
      const data = await parseJsonResponse<{
        repositoryId?: string;
        fullName?: string;
        indexing?: boolean;
        error?: string;
      }>(response);
      if (!data) {
        throw new Error(apiUnreachableMessage());
      }
      if (!response.ok || !data.repositoryId) {
        throw new Error(data.error ?? 'Could not open repository');
      }
      if (data.indexing && !isDemoMode()) {
        const fullName = data.fullName ?? input;
        startIndexProgress({
          repoId: data.repositoryId,
          fullName,
          onReady: () => void router.push(`/dashboard/${data.repositoryId}`)
        });
        void router.push(`/dashboard/${data.repositoryId}`);
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
      seo={{
        title: 'Repository intelligence',
        description: DEFAULT_DESCRIPTION,
        path: '/',
        jsonLd: siteJsonLd()
      }}
    >
      <div className="landing-hero">
        <div className="landing-card landing-card--hero">
          <p className="landing-brand">{LANDING_BRAND}</p>
          <h1>{LANDING_HEADLINE}</h1>
          <p className="landing-lede">{LANDING_LEDE}</p>

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

          <div className="landing-cta-row" aria-label="Secondary actions">
            <Link href={GITHUB_SIGN_IN_URL} className="landing-link">
              Sign in for private repos
            </Link>
            <span aria-hidden>·</span>
            <Link href="/docs/getting-started" className="landing-link">
              Getting started
            </Link>
            <span aria-hidden>·</span>
            <Link href="/browse" className="landing-link">
              Browse public repos
            </Link>
          </div>

          <div className="landing-examples">
            <p className="landing-examples__label">Try an example:</p>
            <div className="landing-examples__chips">
              {EXAMPLE_REPOS.map((repo) => (
                <button
                  key={repo.slug}
                  type="button"
                  className="landing-chip"
                  disabled={loading}
                  onClick={() => {
                    setUrl(githubUrl(repo.slug));
                    void openRepo(repo.slug);
                  }}
                >
                  {repo.label}
                </button>
              ))}
            </div>
          </div>

          <p className="landing-note">
            {isDemoMode()
              ? 'Demo mode uses fixtures after paste.'
              : 'First run may take a minute while we clone and index.'}
            {signedInRepoId ? (
              <>
                {' '}
                <Link href={`/dashboard/${signedInRepoId}`} className="landing-link">
                  Continue to dashboard →
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <section className="landing-section" aria-labelledby="landing-how-title">
        <h2 id="landing-how-title" className="landing-section__title">
          How it works
        </h2>
        <p className="landing-section__lede">Three steps from URL to evidence-backed investigation.</p>
        <ol className="landing-steps">
          {LANDING_HOW_IT_WORKS.map((step, index) => (
            <li key={step.id} className="landing-step">
              <span className="landing-step__num" aria-hidden>
                {index + 1}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-section--why" aria-labelledby="landing-why-title">
        <h2 id="landing-why-title" className="visually-hidden">
          Why RepoPilot
        </h2>
        <DifferentiatorsStrip title="Why RepoPilot" showTagline className="diff-strip--landing" />
      </section>

      <p className="landing-footer">
        <Link href="/docs">Docs</Link>
        <span aria-hidden> · </span>
        <Link href="/mcp">MCP for agents</Link>
        <span aria-hidden> · </span>
        <Link href={MARKETING_URL}>Marketing site</Link>
      </p>
    </PublicPageLayout>
  );
}
