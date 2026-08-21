import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { GithubLogo } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Pagination } from '../components/ui/Pagination';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';
import { RepoCard } from '../components/ui/RepoCard';
import { PageLoading } from '../components/ui/Skeleton';
import {
  filterUserRepos,
  type RepoSort,
  type RepoVisibilityFilter
} from '../components/ui/repoPickerUtils';
import { GITHUB_SIGN_IN_URL } from '../lib/auth';
import { browseResultRange, listTotalPages } from '../lib/browsePagination';

type RepoRow = {
  id: string;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  description: string | null;
  updatedAt: string;
};

const REPOS_PAGE_SIZE = 5;

export default function ReposPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<RepoRow[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<RepoVisibilityFilter>('all');
  const [sort, setSort] = useState<RepoSort>('updated');

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
      setPage(1);
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

  const filtered = useMemo(
    () => filterUserRepos(repos, query, visibility, sort),
    [repos, query, visibility, sort]
  );
  const totalPages = listTotalPages(filtered.length, REPOS_PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);
  const pageRepos = filtered.slice((currentPage - 1) * REPOS_PAGE_SIZE, currentPage * REPOS_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, visibility, sort]);

  function goToPage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <PublicPageLayout
      active="repos"
      pageClassName="ui-repos-page"
      mainClassName="ui-repos-page__main"
      shellClassName="ui-repos-shell"
      seo={{
        title: 'Choose a repository',
        description: 'Pick a GitHub repository to open in RepoPilot.',
        path: '/repos',
        noIndex: true
      }}
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

        {!needsSignIn ? (
          <div className="browse-filters ui-repos-filters">
            <label>
              Search
              <input
                className="ui-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, owner, or description"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <label>
              Visibility
              <select
                className="ui-input"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as RepoVisibilityFilter)}
              >
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label>
              Sort
              <select
                className="ui-input"
                value={sort}
                onChange={(event) => setSort(event.target.value as RepoSort)}
              >
                <option value="updated">Most recent</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        ) : null}

        {!needsSignIn && loading ? (
          <PageLoading label="Loading your GitHub repositories…" />
        ) : !needsSignIn && repos.length === 0 ? (
          <p className="empty-state">No repositories found on your GitHub account.</p>
        ) : !needsSignIn && filtered.length === 0 ? (
          <p className="empty-state">No repositories match your search or filters.</p>
        ) : !needsSignIn ? (
          <>
            <p className="browse-meta">
              Showing {browseResultRange(currentPage, filtered.length, pageRepos.length, REPOS_PAGE_SIZE)}
            </p>
            <div className="ui-repos-grid">
              {pageRepos.map((repo) => (
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
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              label="Repository pages"
            />
          </>
        ) : null}
    </PublicPageLayout>
  );
}
