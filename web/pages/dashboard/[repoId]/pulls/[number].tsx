import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, GitPullRequest, Warning } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { EngineeringLoopStrip } from '../../../../components/ui/EngineeringLoopStrip';
import { BentoPanel } from '../../../../components/ui/BentoPanel';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../../components/ui/ErrorBanner';
import { KpiTile } from '../../../../components/ui/KpiTile';
import { OutcomeIcon } from '../../../../components/ui/OutcomeIcon';
import { ReviewFindingCard } from '../../../../components/ui/ReviewFindingCard';
import { StatusBadge, reviewStatusVariant } from '../../../../components/ui/StatusBadge';
import {
  demoDelay,
  demoPullDetail,
  demoPullImpact,
  demoSimilarChanges
} from '../../../../lib/demoData';
import { isDemoMode } from '../../../../lib/demoMode';
import { useDashboardContext } from '../../../../lib/dashboard';
import { looksLikeRepoFilePath } from '../../../../lib/modulePaths';
import {
  countFindingsBySeverity,
  filterFindingsBySeverity,
  type FindingSeverityFilter
} from '../../../../lib/prFindings';
import { repoApiPath } from '../../../../lib/serverApi';
import type {
  PullImpactSummary,
  PullRequestDetail,
  PullReviewResult,
  SimilarChange
} from '../../../../lib/types';

function deriveImpact(review: PullRequestDetail['latestReview']): PullImpactSummary | null {
  if (!review) return null;
  const tests = review.summary.testSignals.length;
  const symbols = review.summary.symbolsChanged;
  let risk: PullImpactSummary['risk'] = 'LOW';
  if (review.findings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')) {
    risk = 'HIGH';
  } else if (review.findings.length > 0 || symbols > 2) {
    risk = 'MEDIUM';
  }
  return {
    risk,
    directDependents: Math.max(1, symbols),
    transitiveDependents: Math.max(symbols * 3, review.summary.filesChanged),
    relevantTests: tests,
    changedModules: review.summary.testSignals.slice(0, 4)
  };
}

export default function PullDetailPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const repoFullName = dash?.repoFullName;
  const pullNumberRaw = typeof router.query.number === 'string' ? router.query.number : null;
  const pullNumber = pullNumberRaw ? Number(pullNumberRaw) : NaN;

  const [detail, setDetail] = useState<PullRequestDetail | null>(null);
  const [impact, setImpact] = useState<PullImpactSummary | null>(null);
  const [similar, setSimilar] = useState<SimilarChange[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<FindingSeverityFilter>('ALL');

  async function loadPullImpact(activeRepoId: string, n: number, fallbackReview: PullRequestDetail['latestReview']) {
    try {
      const impactResponse = await fetch(repoApiPath(activeRepoId, `impact?pullNumber=${n}&depth=2`));
      if (impactResponse.ok) {
        const pullImpact = (await impactResponse.json()) as {
          risk: PullImpactSummary['risk'];
          directDependents: string[];
          transitiveDependents: string[];
          relevantTests: unknown[];
          analyzedFiles: string[];
          summary: string;
        };
        setImpact({
          risk: pullImpact.risk,
          directDependents: pullImpact.directDependents.length,
          transitiveDependents: pullImpact.transitiveDependents.length,
          relevantTests: pullImpact.relevantTests.length,
          changedModules: pullImpact.analyzedFiles.slice(0, 8),
          note: pullImpact.summary
        });
        return;
      }
    } catch {
      /* fall through */
    }
    setImpact(deriveImpact(fallbackReview));
  }

  useEffect(() => {
    if (!repoId || !Number.isFinite(pullNumber)) return;
    const activeRepoId = repoId;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isDemoMode()) {
          await demoDelay(200);
          const demo = demoPullDetail(pullNumber);
          if (!demo) throw new Error('Pull request not found');
          if (!cancelled) {
            setDetail(demo);
            setImpact(demoPullImpact(pullNumber) ?? deriveImpact(demo.latestReview));
            setSimilar(demoSimilarChanges(pullNumber));
          }
          return;
        }

        const response = await fetch(repoApiPath(activeRepoId, `pulls/${pullNumber}`));
        if (!response.ok) throw new Error('Pull request not found');
        const data = (await response.json()) as PullRequestDetail;
        if (cancelled) return;
        setDetail(data);
        await loadPullImpact(activeRepoId, pullNumber, data.latestReview);

        const similarResponse = await fetch(
          repoApiPath(activeRepoId, `similar-changes?pullNumber=${pullNumber}`)
        );
        if (similarResponse.ok) {
          setSimilar((await similarResponse.json()) as SimilarChange[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load pull request');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [repoId, pullNumber]);

  async function runReview() {
    if (!repoId || !Number.isFinite(pullNumber) || isDemoMode()) return;
    setReviewing(true);
    setError(null);
    try {
      const response = await fetch(repoApiPath(repoId, `pulls/${pullNumber}/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync: true })
      });
      if (!response.ok) throw new Error('Review failed — is the repo indexed?');
      const data = (await response.json()) as PullReviewResult | { queued: true };
      if ('queued' in data) {
        throw new Error('Review queued — refresh in a moment');
      }
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              latestReview: {
                reviewId: data.reviewId,
                status: data.status,
                outcome: data.outcome,
                headRevision: data.headRevision,
                baseRevision: data.baseRevision,
                summary: data.summary,
                findings: data.findings
              }
            }
          : prev
      );
      await loadPullImpact(repoId, pullNumber, {
        reviewId: data.reviewId,
        status: data.status,
        outcome: data.outcome,
        headRevision: data.headRevision,
        baseRevision: data.baseRevision,
        summary: data.summary,
        findings: data.findings
      });
      setSeverityFilter('ALL');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setReviewing(false);
    }
  }

  const review = detail?.latestReview;
  const base = repoId ? `/dashboard/${repoId}` : '';
  const severityCounts = useMemo(
    () => countFindingsBySeverity(review?.findings ?? []),
    [review?.findings]
  );
  const visibleFindings = useMemo(
    () => filterFindingsBySeverity(review?.findings ?? [], severityFilter),
    [review?.findings, severityFilter]
  );
  const loopSeedFile = useMemo(() => {
    const fromImpact = impact?.changedModules.find((mod) => looksLikeRepoFilePath(mod));
    if (fromImpact) return fromImpact;
    const fromFinding = review?.findings
      .flatMap((f) => f.evidence.map((e) => e.file))
      .find((file) => looksLikeRepoFilePath(file));
    return fromFinding ?? '';
  }, [impact?.changedModules, review?.findings]);

  return (
    <div className="canvas-inner ui-pr-detail">
        <Link href={`${base}/pulls`} className="ui-pr-detail__back">
          <ArrowLeft size={16} weight="light" aria-hidden />
          Pull requests
        </Link>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {loading ? <p className="empty-state">Loading pull request…</p> : null}

        {detail && !loading ? (
          <>
            <header className="ui-pr-detail__hero">
              <div>
                <div className="ui-pr-detail__title-row">
                  <h1>
                    <span className="mono">#{detail.pullNumber}</span> {detail.title}
                  </h1>
                </div>
                <div className="ui-pr-detail__meta">
                  <span>{detail.status}</span>
                  <span>head {detail.headRevision.slice(0, 7)}</span>
                  <span>base {detail.baseRevision.slice(0, 7)}</span>
                </div>
              </div>
              <div className="ui-pr-detail__actions">
                {review?.outcome ? (
                  <span className="ui-outcome-cell">
                    <OutcomeIcon outcome={review.outcome} />
                    <StatusBadge variant={reviewStatusVariant(review.outcome)}>
                      {review.outcome}
                    </StatusBadge>
                  </span>
                ) : null}
                {!isDemoMode() ? (
                  <Button variant="secondary" disabled={reviewing} onClick={() => void runReview()}>
                    {reviewing ? 'Reviewing…' : 'Run review'}
                  </Button>
                ) : null}
              </div>
            </header>

            {repoId && loopSeedFile ? (
              <div className="ui-planning-loop">
                <p className="label-caps">Engineering loop</p>
                <EngineeringLoopStrip
                  repoId={repoId}
                  filePath={loopSeedFile}
                  pullNumber={detail.pullNumber}
                  active={review ? 'review' : 'pr'}
                />
              </div>
            ) : null}

            {review ? (
              <>
                <div className="ui-pr-detail__kpi-grid">
                  <KpiTile label="Files changed" value={review.summary.filesChanged} />
                  <KpiTile label="Symbols changed" value={review.summary.symbolsChanged} tone="accent" />
                  <KpiTile
                    label="Findings"
                    value={review.summary.findingsCount}
                    tone={review.summary.findingsCount > 0 ? 'danger' : 'success'}
                  />
                  <KpiTile label="Relevant tests" value={review.summary.testSignals.length} tone="warn" />
                </div>

                <p className="ui-pr-detail__summary">{review.summary.summary}</p>

                <div className="ui-pr-detail__grid">
                  <BentoPanel title="Impact intelligence">
                    {impact ? (
                      <div className="ui-impact-panel">
                        <p className={`ui-impact-panel__risk ui-impact-panel__risk--${impact.risk.toLowerCase()}`}>
                          <Warning size={20} weight="fill" aria-hidden />
                          Risk: {impact.risk}
                        </p>
                        <div className="ui-impact-panel__stats">
                          <div className="ui-impact-stat">
                            <span className="ui-impact-stat__value">{impact.directDependents}</span>
                            <span className="ui-impact-stat__label">Direct dependents</span>
                          </div>
                          <div className="ui-impact-stat">
                            <span className="ui-impact-stat__value">{impact.transitiveDependents}</span>
                            <span className="ui-impact-stat__label">Transitive dependents</span>
                          </div>
                          <div className="ui-impact-stat">
                            <span className="ui-impact-stat__value">{impact.relevantTests}</span>
                            <span className="ui-impact-stat__label">Relevant tests</span>
                          </div>
                          <div className="ui-impact-stat">
                            <span className="ui-impact-stat__value">{review.summary.filesChanged}</span>
                            <span className="ui-impact-stat__label">Files in diff</span>
                          </div>
                        </div>
                        {impact.changedModules.length > 0 ? (
                          <ul className="ui-impact-panel__modules">
                            {impact.changedModules.map((mod) => (
                              <li key={mod}>
                                {base && looksLikeRepoFilePath(mod) ? (
                                  <span className="ui-pr-file-actions">
                                    <Link
                                      href={`${base}/impact?file=${encodeURIComponent(mod)}&pull=${pullNumber}`}
                                    >
                                      {mod}
                                    </Link>
                                    <Link
                                      className="ui-pr-file-actions__secondary"
                                      href={`${base}/architecture?file=${encodeURIComponent(mod)}&blast=1`}
                                    >
                                      Graph
                                    </Link>
                                  </span>
                                ) : (
                                  mod
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {impact.note ? <p className="ui-finding-card__desc">{impact.note}</p> : null}
                        {repoId ? (
                          <Link
                            className="ui-diagram__action"
                            href={`/dashboard/${repoId}/impact?pull=${pullNumber}`}
                          >
                            Open full PR impact →
                          </Link>
                        ) : null}
                      </div>
                    ) : (
                      <EmptyState compact title="No impact data" description="Run a review to compute impact." />
                    )}
                  </BentoPanel>

                  <BentoPanel title="Historical similarity">
                    {similar.length > 0 ? (
                      <ul className="ui-similar-list">
                        {similar.map((item) => (
                          <li key={item.pullNumber} className="ui-similar-item">
                            <p className="ui-similar-item__title">
                              {base ? (
                                <Link href={`${base}/pulls/${item.pullNumber}`}>
                                  PR #{item.pullNumber}: {item.title}
                                </Link>
                              ) : (
                                <>
                                  PR #{item.pullNumber}: {item.title}
                                </>
                              )}
                            </p>
                            <p className="ui-similar-item__meta">
                              {item.overlapCount} overlapping file{item.overlapCount === 1 ? '' : 's'}
                              {item.overlapFiles[0] ? ` · ${item.overlapFiles[0]}` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState compact title="No similar changes" description="History ingest may still be running." />
                    )}
                  </BentoPanel>
                </div>

                <BentoPanel title={`Findings (${review.findings.length})`}>
                  {review.findings.length > 0 ? (
                    <>
                      <div className="ui-finding-filters" role="tablist" aria-label="Filter findings by severity">
                        {(
                          [
                            ['ALL', 'All'],
                            ['HIGH', 'High'],
                            ['MEDIUM', 'Medium'],
                            ['LOW', 'Low']
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={severityFilter === id}
                            className={`ui-finding-filter${
                              severityFilter === id ? ' ui-finding-filter--active' : ''
                            }`}
                            onClick={() => setSeverityFilter(id)}
                          >
                            {label}
                            <span className="ui-finding-filter__count">{severityCounts[id]}</span>
                          </button>
                        ))}
                      </div>
                      {visibleFindings.length > 0 ? (
                        <div className="ui-finding-list">
                          {visibleFindings.map((finding) => (
                            <ReviewFindingCard
                              key={finding.title}
                              finding={finding}
                              repoId={repoId}
                              repoFullName={repoFullName}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          compact
                          title="No findings in this bucket"
                          description="Try another severity filter."
                        />
                      )}
                    </>
                  ) : (
                    <EmptyState compact icon={GitPullRequest} title="No findings" description="Review passed without flagged issues." />
                  )}
                </BentoPanel>

                {review.summary.testSignals.length > 0 ? (
                  <BentoPanel title="Test impact">
                    <div className="ui-test-impact">
                      <ul className="ui-test-signals">
                        {review.summary.testSignals.map((test) => (
                          <li key={test}>
                            {base && looksLikeRepoFilePath(test) ? (
                              <Link href={`${base}/impact?file=${encodeURIComponent(test)}`}>{test}</Link>
                            ) : (
                              test
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </BentoPanel>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon={GitPullRequest}
                title="Not reviewed yet"
                description="Trigger a review from GitHub webhook or run one manually."
                action={
                  !isDemoMode() ? (
                    <Button variant="primary" disabled={reviewing} onClick={() => void runReview()}>
                      Run review
                    </Button>
                  ) : null
                }
              />
            )}
          </>
        ) : null}
      </div>
  );
}
