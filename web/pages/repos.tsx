import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

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
    <main className="main-content" style={{ maxWidth: 720, margin: '0 auto', paddingTop: 48 }}>
      <header className="page-header">
        <h1>Choose a repository</h1>
        <p>Pick a repo to open its dashboard. RepoPilot IDs are derived from the GitHub full name.</p>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <p className="empty-state">Loading your GitHub repositories…</p>
      ) : repos.length === 0 ? (
        <p className="empty-state">No repositories found on your GitHub account.</p>
      ) : (
        <div className="repo-grid">
          {repos.map((repo) => (
            <button
              key={repo.id}
              type="button"
              className="repo-item"
              disabled={selecting === repo.fullName}
              onClick={() => void selectRepo(repo.fullName, repo.id)}
            >
              <strong>{repo.fullName}</strong>
              <span>
                {repo.private ? 'Private · ' : ''}
                {repo.description ?? 'No description'}
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
