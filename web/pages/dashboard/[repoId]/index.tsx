import Link from 'next/link';
import { useRouter } from 'next/router';
import { GitPullRequest, Lightning, MagnifyingGlass } from '@phosphor-icons/react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { DifferentiatorsStrip } from '../../../components/ui/DifferentiatorsStrip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { HotspotList } from '../../../components/ui/HotspotList';
import { IndexHint } from '../../../components/ui/IndexHint';
import { KpiTile } from '../../../components/ui/KpiTile';
import { OutcomeIcon } from '../../../components/ui/OutcomeIcon';
import { Button } from '../../../components/ui/Button';
import { StatusBadge, reviewStatusVariant } from '../../../components/ui/StatusBadge';
import {
  DashboardLayout,
  formatLatency,
  shouldShowIndexHint,
  usePendingIndexJobRepoId,
  useRepoData,
  useRepoIndexStatus
} from '../../../lib/dashboard';

export default function OverviewPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { pulls, analytics, hotspots, error, loading } = useRepoData(repoId);
  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const base = repoId ? `/dashboard/${repoId}` : '';
  const needsIndex = shouldShowIndexHint(
    pulls,
    hotspots,
    analytics,
    indexStatus,
    repoId,
    pendingIndexJobRepoId
  );

  return (
    <DashboardLayout activeNav="overview">
      <div className="canvas-inner">
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}
        {loading ? <p className="empty-state">Loading repository data…</p> : null}

        {repoId ? (
          <DifferentiatorsStrip
            title="RepoPilot depth"
            repoBase={base}
            className="diff-strip--dashboard"
          />
        ) : null}

        <div className="ui-quick-actions">
          <Button
            variant="primary"
            icon={<Lightning size={16} weight="fill" />}
            onClick={() => void router.push(`${base}/ask`)}
          >
            Ask a question
          </Button>
          <Button
            variant="secondary"
            icon={<MagnifyingGlass size={16} weight="light" />}
            onClick={() => void router.push(`${base}/search`)}
          >
            Search code
          </Button>
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
                title="No pull requests indexed yet"
                description="Open PRs appear here after the repository is synced."
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
                        className="ui-data-table__row-link"
                        onClick={() => void router.push(`${base}/pulls/${pull.pullNumber}`)}
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

          <BentoPanel title="Code Hotspots">
            <HotspotList hotspots={hotspots} />
          </BentoPanel>
        </div>
      </div>
    </DashboardLayout>
  );
}
