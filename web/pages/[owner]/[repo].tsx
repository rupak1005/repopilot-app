import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { PublicPageLayout } from '../../components/ui/PublicPageLayout';
import { isDemoMode } from '../../lib/demoMode';
import { useIndexProgressUi } from '../../lib/indexProgressUi';
import { apiUnreachableMessage, parseJsonResponse } from '../../lib/parseJsonResponse';

const SLUG_PATTERN = /^[\w.-]+$/;

export default function ShortRepoPage() {
  const router = useRouter();
  const owner = typeof router.query.owner === 'string' ? router.query.owner : '';
  const repo = typeof router.query.repo === 'string' ? router.query.repo : '';
  const slug = owner && repo ? `${owner}/${repo}` : '';

  const [error, setError] = useState<string | null>(null);
  const { startIndexProgress } = useIndexProgressUi();

  useEffect(() => {
    if (!router.isReady || !slug) return;
    if (!SLUG_PATTERN.test(owner) || !SLUG_PATTERN.test(repo)) {
      setError('Invalid repository path.');
      return;
    }

    let cancelled = false;

    async function open() {
      setError(null);
      try {
        const response = await fetch('/api/public/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: slug })
        });
        const data = await parseJsonResponse<{
          repositoryId?: string;
          fullName?: string;
          indexing?: boolean;
          error?: string;
        }>(response);
        if (cancelled) return;
        if (!data) {
          throw new Error(apiUnreachableMessage());
        }
        if (!response.ok || !data.repositoryId) {
          throw new Error(data.error ?? 'Could not open repository');
        }
        const fullName = data.fullName ?? slug;
        if (data.indexing && !isDemoMode()) {
          startIndexProgress({
            repoId: data.repositoryId,
            fullName,
            onReady: () => void router.replace(`/dashboard/${data.repositoryId}`)
          });
          void router.replace(`/dashboard/${data.repositoryId}`);
          return;
        }
        void router.replace(`/dashboard/${data.repositoryId}`);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      }
    }

    void open();
    return () => {
      cancelled = true;
    };
  }, [router, slug, owner, repo, startIndexProgress]);

  return (
    <PublicPageLayout
      active="home"
      pageClassName="landing-page"
      mainClassName="landing-page__main"
      shellClassName="landing-shell"
      seo={{
        title: slug ? `Opening ${slug}` : 'Opening repository',
        description: 'Start indexing a public GitHub repository in RepoPilot.',
        path: slug ? `/${slug}` : '/',
        noIndex: true
      }}
    >
      <div className="landing-card">
        <p className="landing-eyebrow">Opening repository</p>
        <h1>{slug || '…'}</h1>
        <p className="landing-lede">
          {error ? 'We could not start indexing this repository.' : 'Preparing analysis…'}
        </p>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <p className="landing-footer">
          <Link href="/">Back to home</Link>
        </p>
      </div>
    </PublicPageLayout>
  );
}
