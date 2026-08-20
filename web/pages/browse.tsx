import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { ArrowSquareOut, Graph } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { DifferentiatorsStrip } from '../components/ui/DifferentiatorsStrip';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';
import { githubUrl } from '../lib/exampleRepos';
import { isDemoMode } from '../lib/demoMode';
import { useIndexProgressUi } from '../lib/indexProgressUi';
import { apiUnreachableMessage, parseJsonResponse } from '../lib/parseJsonResponse';
import {
  browseResultRange,
  browseTotalPages,
  browseVisiblePages
} from '../lib/browsePagination';

type BrowseItem = {
  fullName: string;
  description: string | null;
  stars: number;
  updatedAt: string;
};

type BrowseSort = 'stars' | 'updated';

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function BrowsePage() {
  const router = useRouter();
  const { startIndexProgress } = useIndexProgressUi();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<BrowseSort>('stars');
  const [minStars, setMinStars] = useState('');
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [query, sort, minStars]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, page: String(page) });
      if (query.trim()) params.set('q', query.trim());
      if (minStars) params.set('minStars', minStars);
      const response = await fetch(`/api/public/browse?${params}`);
      if (!response.ok) throw new Error('Could not load repositories');
      const data = (await response.json()) as { totalCount?: number; items?: BrowseItem[] };
      setItems(data.items ?? []);
      setTotalCount(data.totalCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load browse index');
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [query, sort, minStars, page]);

  const totalPages = browseTotalPages(totalCount);
  const pageItems = browseVisiblePages(page, totalPages);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function openDiagram(fullName: string) {
    setOpening(fullName);
    setError(null);
    try {
      const response = await fetch('/api/public/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: githubUrl(fullName) })
      });
      const data = await parseJsonResponse<{ repositoryId?: string; fullName?: string; indexing?: boolean; error?: string }>(response);
      if (!data) {
        throw new Error(apiUnreachableMessage());
      }
      if (!response.ok || !data.repositoryId) {
        throw new Error(data.error ?? 'Could not open repository');
      }
      if (data.indexing && !isDemoMode()) {
        startIndexProgress({
          repoId: data.repositoryId,
          fullName: data.fullName ?? fullName,
          onReady: () => void router.push(`/dashboard/${data.repositoryId}/architecture`)
        });
      }
      void router.push(`/dashboard/${data.repositoryId}/architecture`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open repository');
      setOpening(null);
    }
  }

  return (
    <PublicPageLayout
      active="browse"
      pageClassName="browse-page"
      mainClassName="browse-main"
      decorVariant="top"
    >
        <header className="browse-hero">
          <h1>Browse public repositories</h1>
          <p>
            Search GitHub by name, filter by stars, and open an interactive architecture diagram
            built from real imports — then explore impact, hotspots, Ask, and PR review in the
            dashboard.
          </p>
        </header>

        <DifferentiatorsStrip title="Why RepoPilot" showTagline />

        <div className="browse-filters">
          <label>
            Search repositories
            <input
              className="ui-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="owner/repo or keyword"
              spellCheck={false}
            />
          </label>
          <label>
            Sort
            <select value={sort} onChange={(event) => setSort(event.target.value as BrowseSort)}>
              <option value="stars">Most stars</option>
              <option value="updated">Most recent</option>
            </select>
          </label>
          <label>
            Minimum stars
            <select value={minStars} onChange={(event) => setMinStars(event.target.value)}>
              <option value="">Any</option>
              <option value="10">10+</option>
              <option value="100">100+</option>
              <option value="1000">1,000+</option>
            </select>
          </label>
        </div>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <p className="browse-meta">
          {loading
            ? 'Loading…'
            : `Showing ${browseResultRange(page, totalCount, items.length)} public repositories`}
        </p>

        <div className="browse-table-wrap">
          {items.length === 0 && !loading ? (
            <p className="browse-empty">No repositories match your filters.</p>
          ) : (
            <table className="browse-table">
              <thead>
                <tr>
                  <th scope="col">Repository</th>
                  <th scope="col">Stars</th>
                  <th scope="col">Updated</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((repo) => (
                  <tr key={repo.fullName}>
                    <td>
                      <div className="browse-repo-name">{repo.fullName}</div>
                      {repo.description ? (
                        <p className="browse-repo-desc">{repo.description}</p>
                      ) : null}
                    </td>
                    <td className="browse-stars">{formatStars(repo.stars)}</td>
                    <td>{formatDate(repo.updatedAt)}</td>
                    <td>
                      <div className="browse-actions">
                        <Button
                          variant="primary"
                          size="md"
                          disabled={opening === repo.fullName}
                          icon={<Graph size={16} weight="bold" />}
                          onClick={() => void openDiagram(repo.fullName)}
                        >
                          {opening === repo.fullName ? 'Opening…' : 'Open diagram'}
                        </Button>
                        <Button
                          href={githubUrl(repo.fullName)}
                          variant="secondary"
                          size="md"
                          icon={<ArrowSquareOut size={16} weight="bold" />}
                        >
                          GitHub
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && !loading ? (
          <nav className="browse-pagination" aria-label="Browse pages">
            <button
              type="button"
              className="browse-pagination__btn"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <ol className="browse-pagination__pages">
              {pageItems.map((item, index) =>
                item === '…' ? (
                  <li key={`gap-${index}`} className="browse-pagination__gap" aria-hidden>
                    …
                  </li>
                ) : (
                  <li key={item}>
                    <button
                      type="button"
                      className={`browse-pagination__page${item === page ? ' browse-pagination__page--active' : ''}`}
                      aria-current={item === page ? 'page' : undefined}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  </li>
                )
              )}
            </ol>
            <button
              type="button"
              className="browse-pagination__btn"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </nav>
        ) : null}

        <p className="browse-meta">
          <Link href="/">← Back to home</Link>
        </p>
    </PublicPageLayout>
  );
}
