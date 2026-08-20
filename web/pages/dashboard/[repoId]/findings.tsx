import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass, Warning } from '@phosphor-icons/react';
import { DashboardLayout, useDashboardContext } from '../../../lib/dashboard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { ReviewFindingCard } from '../../../components/ui/ReviewFindingCard';
import { demoDelay, demoRepoFindings } from '../../../lib/demoData';
import { isDemoMode } from '../../../lib/demoMode';
import {
  FINDING_SEVERITY_FILTERS,
  applyFindingsBoardFilters,
  countRepoFindings,
  listFindingCategories,
  parseFindingsCategory,
  parseFindingsQuery,
  parseFindingsSeverity,
  sortFindingsBySeverity,
  type RepoFinding
} from '../../../lib/findings';
import type { FindingSeverityFilter } from '../../../lib/prFindings';
import { repoApiPath } from '../../../lib/serverApi';

export default function FindingsPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const repoFullName = dash?.repoFullName;
  const severity = parseFindingsSeverity(router.query.severity);
  const queryText = parseFindingsQuery(router.query.q);
  const [findings, setFindings] = useState<RepoFinding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftQuery, setDraftQuery] = useState(queryText);
  const base = repoId ? `/dashboard/${repoId}` : '';

  useEffect(() => {
    setDraftQuery(queryText);
  }, [queryText]);

  useEffect(() => {
    if (!repoId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isDemoMode()) {
          await demoDelay(200);
          if (!cancelled) setFindings(sortFindingsBySeverity(demoRepoFindings()));
          return;
        }
        const response = await fetch(repoApiPath(repoId!, 'findings?limit=80'));
        if (!response.ok) throw new Error('Could not load findings — run PR reviews first.');
        const data = (await response.json()) as RepoFinding[];
        if (!cancelled) setFindings(sortFindingsBySeverity(data));
      } catch (err) {
        if (!cancelled) {
          setFindings([]);
          setError(err instanceof Error ? err.message : 'Failed to load findings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  const categories = useMemo(() => listFindingCategories(findings), [findings]);
  const category = parseFindingsCategory(router.query.category, categories);
  const counts = useMemo(() => countRepoFindings(findings), [findings]);
  const visible = useMemo(
    () => applyFindingsBoardFilters(findings, { severity, category, query: queryText }),
    [findings, severity, category, queryText]
  );

  function replaceFilters(next: {
    severity?: FindingSeverityFilter;
    category?: string | null;
    q?: string;
  }) {
    if (!repoId) return;
    const query: Record<string, string> = {};
    const sev = next.severity ?? severity;
    const cat = next.category !== undefined ? next.category : category;
    const q = next.q !== undefined ? next.q : queryText;
    if (sev !== 'ALL') query.severity = sev;
    if (cat) query.category = cat;
    if (q.trim()) query.q = q.trim();
    void router.replace({ pathname: `/dashboard/${repoId}/findings`, query }, undefined, {
      shallow: true
    });
  }

  return (
    <DashboardLayout activeNav="findings">
      <div className="canvas-inner ui-findings-page">
        <div className="page-title-block">
          <h1>Findings</h1>
          <p>
            Review findings from the latest PR reviews — filter by severity, category, or text, then
            jump to the PR or cited files.
          </p>
        </div>

        {error ? <ErrorBanner onDismiss={() => setError(null)}>{error}</ErrorBanner> : null}

        <form
          className="ui-findings-search"
          onSubmit={(event) => {
            event.preventDefault();
            replaceFilters({ q: draftQuery });
          }}
        >
          <label className="ui-findings-search__label" htmlFor="findings-q">
            Search findings
          </label>
          <div className="ui-findings-search__row">
            <MagnifyingGlass size={16} weight="bold" aria-hidden />
            <input
              id="findings-q"
              type="search"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Title, file, PR, category…"
            />
            <button type="submit" className="ui-diagram__action">
              Search
            </button>
          </div>
        </form>

        <div className="ui-finding-filters" role="tablist" aria-label="Filter findings by severity">
          {FINDING_SEVERITY_FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={severity === key}
              className={`ui-finding-filter${severity === key ? ' ui-finding-filter--active' : ''}`}
              onClick={() => replaceFilters({ severity: key })}
            >
              {key === 'ALL' ? 'All' : key.charAt(0) + key.slice(1).toLowerCase()}
              <span className="ui-finding-filter__count">{counts[key]}</span>
            </button>
          ))}
        </div>

        {categories.length > 0 ? (
          <div className="ui-finding-filters" role="tablist" aria-label="Filter findings by category">
            <button
              type="button"
              role="tab"
              aria-selected={!category}
              className={`ui-finding-filter${!category ? ' ui-finding-filter--active' : ''}`}
              onClick={() => replaceFilters({ category: null })}
            >
              All categories
            </button>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={category === name}
                className={`ui-finding-filter${category === name ? ' ui-finding-filter--active' : ''}`}
                onClick={() => replaceFilters({ category: name })}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? <p className="empty-state">Loading findings…</p> : null}

        {!loading && visible.length === 0 ? (
          <EmptyState
            icon={Warning}
            title={findings.length === 0 ? 'No findings yet' : 'No findings match these filters'}
            description={
              findings.length === 0
                ? 'Open a pull request and run a review to populate this board.'
                : 'Try clearing search, category, or severity.'
            }
            action={
              base ? (
                <Link className="ui-diagram__action" href={`${base}/pulls`}>
                  Open pull requests →
                </Link>
              ) : undefined
            }
          />
        ) : null}

        <ul className="ui-findings-list">
          {visible.map((finding) => (
            <li key={finding.id} className="ui-findings-item">
              <div className="ui-findings-item__meta">
                {base ? (
                  <Link
                    className="ui-findings-item__pr"
                    href={`${base}/pulls/${finding.pullNumber}`}
                  >
                    #{finding.pullNumber}
                  </Link>
                ) : (
                  <span className="ui-findings-item__pr">#{finding.pullNumber}</span>
                )}
                <span className="ui-findings-item__title" title={finding.pullTitle}>
                  {finding.pullTitle}
                </span>
              </div>
              <ReviewFindingCard
                finding={finding}
                repoId={repoId}
                repoFullName={repoFullName}
                revisionSha={finding.headRevision}
              />
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
