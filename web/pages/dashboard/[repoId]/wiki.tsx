import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowSquareOut, BookOpen, MagnifyingGlass } from '@phosphor-icons/react';
import { useDashboardContext, useNeedsIndexHint } from '../../../lib/dashboard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { IndexHint } from '../../../components/ui/IndexHint';
import { WikiMarkdown } from '../../../components/ui/WikiMarkdown';
import { PageLoading } from '../../../components/ui/Skeleton';
import { demoDelay, demoWikiPageDetail, demoWikiPages } from '../../../lib/demoData';
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
  parseWikiPathQuery,
  wikiHref,
  wikiKindLabel,
  type WikiPage,
  type WikiPageDetail
} from '../../../lib/wiki';

export default function WikiPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const repoFullName = dash?.repoFullName;
  const needsIndex = useNeedsIndexHint(repoId);
  const kind = parseWikiKindFilter(router.query.kind);
  const selectedPath = parseWikiPathQuery(router.query.path);
  const revisionSha = parseRevisionQuery(router.query[REVISION_QUERY_KEY]);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [detail, setDetail] = useState<WikiPageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const base = repoId ? `/dashboard/${repoId}` : '';

  useEffect(() => {
    if (!repoId || selectedPath) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setDetail(null);
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
  }, [repoId, revisionSha, selectedPath]);

  useEffect(() => {
    if (!repoId || !selectedPath) return;
    let cancelled = false;
    async function loadDetail() {
      setLoading(true);
      setError(null);
      try {
        if (isDemoMode()) {
          await demoDelay(120);
          if (!cancelled) setDetail(demoWikiPageDetail(selectedPath!));
          return;
        }
        const response = await fetch(
          repoApiPath(
            repoId!,
            withRevisionSha(`wiki?path=${encodeURIComponent(selectedPath!)}`, revisionSha)
          )
        );
        if (!response.ok) throw new Error('Could not load this wiki page.');
        const data = (await response.json()) as { page?: WikiPageDetail | null };
        if (!cancelled) setDetail(data.page ?? null);
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setError(err instanceof Error ? err.message : 'Failed to load wiki page');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [repoId, revisionSha, selectedPath]);

  const counts = useMemo(() => countWikiPagesByKind(pages), [pages]);
  const visible = useMemo(() => filterWikiPages(pages, kind), [pages, kind]);

  function setKind(next: typeof kind) {
    if (!repoId) return;
    void router.replace(
      wikiHref(repoId, { kind: next, revisionSha }),
      undefined,
      { shallow: true }
    );
  }

  function openPage(path: string) {
    if (!repoId) return;
    void router.push(wikiHref(repoId, { path, kind, revisionSha }));
  }

  function closePage() {
    if (!repoId) return;
    void router.push(wikiHref(repoId, { kind, revisionSha }));
  }

  const active = detail;
  const githubHref =
    repoFullName && (active?.path || selectedPath)
      ? githubModuleUrl(repoFullName, active?.path ?? selectedPath!, revisionSha ?? undefined)
      : null;

  if (selectedPath) {
    return (
      <div className="canvas-inner ui-wiki-page">
          <div className="ui-wiki-reader__bar">
            <button type="button" className="ui-diagram__action" onClick={closePage}>
              <ArrowLeft size={14} weight="bold" aria-hidden /> All pages
            </button>
            {githubHref ? (
              <a className="ui-diagram__action" href={githubHref} target="_blank" rel="noreferrer">
                GitHub <ArrowSquareOut size={14} weight="bold" aria-hidden />
              </a>
            ) : null}
            {base && active ? (
              <Link
                className="ui-diagram__action"
                href={`${base}/ask?q=${encodeURIComponent(`Summarize ${active.path}`)}`}
              >
                Ask
              </Link>
            ) : null}
          </div>

          {error ? <ErrorBanner onDismiss={() => setError(null)}>{error}</ErrorBanner> : null}
          {loading ? <PageLoading label="Loading page…" /> : null}

          {!loading && !active ? (
            <EmptyState
              icon={BookOpen}
              title="Page not found in index"
              description={
                selectedPath
                  ? `${selectedPath} is missing from this indexed revision, or it is not markdown. This repo may only have a README — open Wiki for listed pages, or switch to a repo that includes docs/.`
                  : 'This path is missing from the indexed revision, or it is not markdown.'
              }
              action={
                <button type="button" className="ui-diagram__action" onClick={closePage}>
                  Back to wiki →
                </button>
              }
            />
          ) : null}

          {active ? (
            <article className="ui-wiki-reader">
              <header className="ui-wiki-reader__head">
                <span className="ui-wiki-card__kind label-caps">{wikiKindLabel(active.kind)}</span>
                <h1>{active.title}</h1>
                <p className="ui-wiki-card__path mono">{active.path}</p>
              </header>
              <WikiMarkdown source={active.content} />
            </article>
          ) : null}
        </div>
    );
  }

  return (
    <div className="canvas-inner ui-wiki-page">
        <div className="page-title-block">
          <h1>Wiki</h1>
          <p>
            Indexed markdown and ADRs from this repository — filter by kind, open a page inline, or
            jump to GitHub / Ask / Search.
          </p>
        </div>

        {needsIndex ? <IndexHint repoFullName={repoFullName} /> : null}

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

        {loading ? <PageLoading label="Loading wiki…" /> : null}

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
            const pageGithub =
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
                <button
                  type="button"
                  className="ui-wiki-card__open"
                  onClick={() => openPage(page.path)}
                >
                  <span className="ui-wiki-card__kind label-caps">{wikiKindLabel(page.kind)}</span>
                  <span className="ui-wiki-card__title">{page.title}</span>
                  <span className="ui-wiki-card__path mono">{page.path}</span>
                  {page.excerpt ? <span className="ui-wiki-card__excerpt">{page.excerpt}</span> : null}
                </button>
                <div className="ui-wiki-card__actions">
                  <button type="button" className="ui-diagram__action" onClick={() => openPage(page.path)}>
                    Read
                  </button>
                  {pageGithub ? (
                    <a
                      className="ui-diagram__action"
                      href={pageGithub}
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
  );
}
