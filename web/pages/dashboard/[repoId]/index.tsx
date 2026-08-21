import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ClockCounterClockwise,
  Crosshair,
  GitPullRequest,
  Graph,
  Lightning,
  MagnifyingGlass
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { Button } from '../../../components/ui/Button';
import { DifferentiatorsStrip } from '../../../components/ui/DifferentiatorsStrip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { HotspotList } from '../../../components/ui/HotspotList';
import { IndexHint } from '../../../components/ui/IndexHint';
import { KpiTile } from '../../../components/ui/KpiTile';
import { OutcomeIcon } from '../../../components/ui/OutcomeIcon';
import { StatusBadge, reviewStatusVariant } from '../../../components/ui/StatusBadge';
import { formatLatency, shouldShowIndexHint, useDashboardContext, usePendingIndexJobRepoId, useRepoData, useRepoIndexStatus } from '../../../lib/dashboard';
import { PageLoading } from '../../../components/ui/Skeleton';
import { rowLinkProps } from '../../../lib/a11y';
import { OVERVIEW_ACTIONS, overviewPulse } from '../../../lib/overview';

const ACTION_ICONS: Record<string, Icon> = {
  ask: Lightning,
  search: MagnifyingGlass,
  architecture: Graph,
  impact: Crosshair,
  history: ClockCounterClockwise
};

export default function OverviewPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const repoFullName = dash?.repoFullName;
  const { pulls, analytics, hotspots, error, loading } = useRepoData(repoId);
  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const base = repoId ? `/dashboard/${repoId}` : '';
  const githubPullsHref = repoFullName ? `https://github.com/${repoFullName}/pulls` : null;
  const needsIndex = shouldShowIndexHint(
    pulls,
    hotspots,
    analytics,
    indexStatus,
    repoId,
    pendingIndexJobRepoId
  );
  const pulse = overviewPulse({
    indexStatus,
    pullCount: pulls.length,
    hotspotCount: hotspots.length
  });

  return (
    <div className="canvas-inner">
        <div className="page-title-block ui-overview-hero">
          <div>
            <h1>Overview</h1>
            <p className="ui-overview-pulse__headline">{pulse.headline}</p>
            <p className="ui-overview-pulse__detail">{pulse.detail}</p>
          </div>
          {base ? (
            <Link className="ui-overview-pulse__settings" href={`${base}/settings`}>
              Index settings →
            </Link>
          ) : null}
        </div>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}
        {loading ? <PageLoading label="Loading repository data…" /> : null}

        {repoId ? (
          <DifferentiatorsStrip
            title="Explore this repo"
            repoBase={base}
            className="diff-strip--dashboard"
          />
        ) : null}

        <div className="ui-quick-actions" role="group" aria-label="Quick actions">
          {OVERVIEW_ACTIONS.map((action) => {
            const Icon = ACTION_ICONS[action.id] ?? Lightning;
            return (
              <Button
                key={action.id}
                variant={action.primary ? 'primary' : 'secondary'}
                icon={<Icon size={16} weight={action.primary ? 'fill' : 'light'} />}
                onClick={() => void router.push(`${base}${action.path}`)}
              >
                {action.label}
              </Button>
            );
          })}
        </div>

        {analytics ? (
          <div className="ui-kpi-grid">
            <KpiTile label="Total Reviews" value={analytics.totalReviews.toLocaleString()} />
            <KpiTile
              label="Completed"
              value={analytics.completedReviews.toLocaleString()}
              tone="success"
            />
            <KpiTile
              label="Failed"
              value={analytics.failedReviews}
              tone="danger"
              meta={analytics.failedReviews > 0 ? 'Attention' : undefined}
            />
            <KpiTile
              label="Avg Latency"
              value={formatLatency(analytics.averageReviewLatencyMs)}
              meta="p95"
              tone="accent"
            />
          </div>
        ) : null}

        <div className="ui-bento-grid">
          <BentoPanel
            title="Active Pull Requests"
            action={<Link href={`${base}/pulls`}>View all</Link>}
          >
            {pulls.length === 0 ? (
              <EmptyState
                compact
                className="ui-panel-empty"
                icon={GitPullRequest}
                title="No pull requests in this indexed revision"
                description="PRs will appear here after GitHub history is synced for this repository."
                action={
                  <div className="ui-empty-state__actions">
                    {githubPullsHref ? (
                      <a className="ui-diagram__action" href={githubPullsHref} target="_blank" rel="noreferrer">
                        View GitHub
                      </a>
                    ) : null}
                    {base ? (
                      <Link className="ui-diagram__action" href={`${base}/settings`}>
                        Re-index →
                      </Link>
                    ) : null}
                  </div>
                }
              />
            ) : (
              <div className="ui-table-scroll">
                <table className="ui-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>#PR</th>
                      <th>Title</th>
                      <th style={{ width: 128 }}>Status</th>
                      <th style={{ width: 96 }}>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pulls.slice(0, 6).map((pull) => (
                      <tr
                        key={pull.pullNumber}
                        {...rowLinkProps(() => void router.push(`${base}/pulls/${pull.pullNumber}`))}
                      >
                        <td className="mono">
                          <Link href={`${base}/pulls/${pull.pullNumber}`}>#{pull.pullNumber}</Link>
                        </td>
                        <td>
                          <Link href={`${base}/pulls/${pull.pullNumber}`}>{pull.title}</Link>
                        </td>
                        <td>
                          <StatusBadge variant={reviewStatusVariant(pull.latestReviewStatus)}>
                            {(pull.latestReviewStatus ?? pull.status).toUpperCase()}
                          </StatusBadge>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <OutcomeIcon outcome={pull.latestReviewOutcome} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </BentoPanel>

          <BentoPanel
            title="Code Hotspots"
            action={<Link href={`${base}/hotspots`}>Topography</Link>}
          >
            <HotspotList hotspots={hotspots} repoId={repoId} />
          </BentoPanel>
        </div>
      </div>
  );
}
