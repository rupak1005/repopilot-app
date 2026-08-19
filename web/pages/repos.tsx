import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { GithubLogo } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { GITHUB_SIGN_IN_URL } from '../lib/auth';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';
import { RepoCard } from '../components/ui/RepoCard';
import { ErrorBanner } from '../components/ui/ErrorBanner';

type RepoRow = {
  id: string;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  description: string | null;
  updatedAt: string;
};

export default function ReposPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<RepoRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    async function load() {
      const me = await fetch('/api/auth/me');
      if (!me.ok) {
        setNeedsSignIn(true);
        setLoading(false);
        return;
      }

      const user = (await me.json()) as { isPublicGuest?: boolean };
      if (user.isPublicGuest) {
        setNeedsSignIn(true);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/repos');
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? 'Failed to load repositories');
        setLoading(false);
        return;
      }
      setRepos((await response.json()) as RepoRow[]);
      setLoading(false);
    }
    void load();
  }, [router]);

  async function selectRepo(fullName: string, id: string) {
    setSelecting(fullName);
    setError(null);
    const response = await fetch('/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName })
    });
    if (!response.ok) {
      setError('Could not select repository');
      setSelecting(null);
      return;
    }
    void fetch(`/api/repositories/${id}/index`, { method: 'POST' });
    void router.push(`/dashboard/${id}`);
  }

  return (
    <PublicPageLayout
      active="repos"
      pageClassName="ui-repos-page"
      mainClassName="ui-repos-page__main"
      shellClassName="ui-repos-shell"
    >
        <div className="page-title-block">
          <h1>Choose a repository</h1>
          <p>Pick a repo to open its dashboard.</p>
        </div>

        {needsSignIn ? (
          <div className="ui-repos-signin">
            <p>Sign in with GitHub to list and switch between your repositories.</p>
            <Button href={GITHUB_SIGN_IN_URL} variant="primary" icon={<GithubLogo size={18} weight="fill" />}>
              Connect GitHub
            </Button>
          </div>
        ) : null}

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        {!needsSignIn && loading ? (
          <p className="empty-state">Loading your GitHub repositories…</p>
        ) : !needsSignIn && repos.length === 0 ? (
          <p className="empty-state">No repositories found on your GitHub account.</p>
        ) : !needsSignIn ? (
          <div className="ui-repos-grid">
            {repos.map((repo) => (
              <RepoCard
                key={repo.id}
                fullName={repo.fullName}
                owner={repo.owner}
                name={repo.name}
                description={repo.description}
                isPrivate={repo.private}
                updatedAt={repo.updatedAt}
                selecting={selecting === repo.fullName}
                onSelect={() => void selectRepo(repo.fullName, repo.id)}
              />
            ))}
          </div>
        ) : null}
    </PublicPageLayout>
  );
}
