import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { RepoCard } from '../components/ui/RepoCard';

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

  useEffect(() => {
    async function load() {
      const me = await fetch('/api/auth/me');
      if (!me.ok) {
        void router.replace('/login');
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
    void router.push(`/dashboard/${id}`);
  }

  return (
    <main className="ui-repos-page">
      <div className="page-title-block">
        <h1>Choose a repository</h1>
        <p>Pick a repo to open its dashboard.</p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <p className="empty-state">Loading your GitHub repositories…</p>
      ) : repos.length === 0 ? (
        <p className="empty-state">No repositories found on your GitHub account.</p>
      ) : (
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
      )}
    </main>
  );
}
