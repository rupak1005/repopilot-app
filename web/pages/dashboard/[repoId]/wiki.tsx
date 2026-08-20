import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowSquareOut, BookOpen, MagnifyingGlass } from '@phosphor-icons/react';
import { DashboardLayout, useDashboardContext } from '../../../lib/dashboard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { demoDelay, demoWikiPages } from '../../../lib/demoData';
import { isDemoMode } from '../../../lib/demoMode';
import { githubModuleUrl } from '../../../lib/modulePaths';
import {
  REVISION_QUERY_KEY,
  parseRevisionQuery,
  withRevisionSha
} from '../../../lib/revisionScope';
import { repoApiPath } from '../../../lib/serverApi';
import {
  WIKI_KIND_FILTERS,
  countWikiPagesByKind,
  filterWikiPages,
  parseWikiKindFilter,
  wikiKindLabel,
  type WikiPage
} from '../../../lib/wiki';

export default function WikiPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const repoFullName = dash?.repoFullName;
  const kind = parseWikiKindFilter(router.query.kind);
  const revisionSha = parseRevisionQuery(router.query[REVISION_QUERY_KEY]);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const base = repoId ? `/dashboard/${repoId}` : '';

  useEffect(() => {
    if (!repoId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isDemoMode()) {
          await demoDelay(180);
          if (!cancelled) setPages(demoWikiPages());
          return;
        }
        const response = await fetch(
          repoApiPath(repoId!, withRevisionSha('wiki?limit=80', revisionSha))
        );
        if (!response.ok) throw new Error('Could not load wiki pages — index the repository first.');
        const data = (await response.json()) as { pages?: WikiPage[] };
        if (!cancelled) setPages(Array.isArray(data.pages) ? data.pages : []);
      } catch (err) {
        if (!cancelled) {
          setPages([]);
          setError(err instanceof Error ? err.message : 'Failed to load wiki');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoId, revisionSha]);

  const counts = useMemo(() => countWikiPagesByKind(pages), [pages]);
  const visible = useMemo(() => filterWikiPages(pages, kind), [pages, kind]);

  function setKind(next: typeof kind) {
    if (!repoId) return;
    const query: Record<string, string> = {};
    if (next !== 'ALL') query.kind = next;
    if (revisionSha) query[REVISION_QUERY_KEY] = revisionSha;
    void router.replace({ pathname: `/dashboard/${repoId}/wiki`, query }, undefined, {
      shallow: true
    });
  }

  return (
    <DashboardLayout activeNav="wiki">
      <div className="canvas-inner ui-wiki-page">
        <div className="page-title-block">
          <h1>Wiki</h1>
          <p>
            Indexed markdown and ADRs from this repository — filter by kind, then open on GitHub or
            ask about a page.
          </p>
        </div>

        {error ? <ErrorBanner onDismiss={() => setError(null)}>{error}</ErrorBanner> : null}

        <div className="ui-finding-filters" role="tablist" aria-label="Filter wiki pages by kind">
          {WIKI_KIND_FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={kind === key}
              className={`ui-finding-filter${kind === key ? ' ui-finding-filter--active' : ''}`}
              onClick={() => setKind(key)}
            >
              {wikiKindLabel(key)}
              <span className="ui-finding-filter__count">{counts[key]}</span>
            </button>
          ))}
        </div>

        {loading ? <p className="empty-state">Loading wiki…</p> : null}

        {!loading && visible.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={pages.length === 0 ? 'No markdown docs indexed' : 'No pages in this filter'}
            description={
              pages.length === 0
                ? 'Index a revision that includes README, docs/, or ADR markdown to populate Wiki.'
                : 'Try All or another kind filter.'
            }
            action={
              base ? (
                <Link className="ui-diagram__action" href={`${base}/ask`}>
                  Ask RepoPilot →
                </Link>
              ) : undefined
            }
          />
        ) : null}

        <ul className="ui-wiki-list">
          {visible.map((page) => {
            const githubHref =
              repoFullName != null
                ? githubModuleUrl(repoFullName, page.path, revisionSha ?? undefined)
                : null;
            const askHref = base
              ? `${base}/ask?q=${encodeURIComponent(`Summarize ${page.path}`)}`
              : null;
            const searchHref = base
              ? `${base}/search?q=${encodeURIComponent(page.title)}`
              : null;
            return (
              <li key={page.path} className="ui-wiki-card">
                <div className="ui-wiki-card__top">
                  <span className="ui-wiki-card__kind label-caps">{wikiKindLabel(page.kind)}</span>
                  <h2 className="ui-wiki-card__title">{page.title}</h2>
                  <p className="ui-wiki-card__path mono">{page.path}</p>
                  {page.excerpt ? <p className="ui-wiki-card__excerpt">{page.excerpt}</p> : null}
                </div>
                <div className="ui-wiki-card__actions">
                  {githubHref ? (
                    <a
                      className="ui-diagram__action"
                      href={githubHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub <ArrowSquareOut size={14} weight="bold" aria-hidden />
                    </a>
                  ) : null}
                  {askHref ? (
                    <Link className="ui-diagram__action" href={askHref}>
                      Ask
                    </Link>
                  ) : null}
                  {searchHref ? (
                    <Link className="ui-diagram__action" href={searchHref}>
                      <MagnifyingGlass size={14} weight="bold" aria-hidden /> Search
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </DashboardLayout>
  );
}
