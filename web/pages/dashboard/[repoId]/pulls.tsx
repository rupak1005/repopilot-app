import Link from 'next/link';
import { useRouter } from 'next/router';
import { GitPullRequest } from '@phosphor-icons/react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { IndexHint } from '../../../components/ui/IndexHint';
import { OutcomeIcon } from '../../../components/ui/OutcomeIcon';
import { StatusBadge, reviewStatusVariant } from '../../../components/ui/StatusBadge';
import { DashboardLayout, shouldShowIndexHint, usePendingIndexJobRepoId, useRepoData, useRepoIndexStatus } from '../../../lib/dashboard';

export default function PullsPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { pulls, analytics, hotspots, error, loading } = useRepoData(repoId);
  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const needsIndex = shouldShowIndexHint(
    pulls,
    hotspots,
    analytics,
    indexStatus,
    repoId,
    pendingIndexJobRepoId
  );
  const base = repoId ? `/dashboard/${repoId}` : '';

  return (
    <DashboardLayout activeNav="pulls">
      <div className="canvas-inner">
        <div className="page-title-block">
          <h1>Pull Requests</h1>
          <p>Review status and outcomes.</p>
        </div>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}
        {loading ? <p className="empty-state">Loading pull requests…</p> : null}

        <BentoPanel title="All Pull Requests">
          {pulls.length === 0 ? (
            <EmptyState
              compact
              className="ui-panel-empty"
              icon={GitPullRequest}
              title="No pull requests indexed yet"
              description="Open PRs appear here after the repository is synced and reviewed."
            />
          ) : (
            <div className="ui-table-scroll">
              <table className="ui-data-table">
                <thead>
                  <tr>
                    <th>PR</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Review</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {pulls.map((pull) => (
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
                      <td>{pull.status}</td>
                      <td>
                        <StatusBadge variant={reviewStatusVariant(pull.latestReviewStatus)}>
                          {(pull.latestReviewStatus ?? 'none').toUpperCase()}
                        </StatusBadge>
                      </td>
                      <td className="ui-outcome-cell">
                        <OutcomeIcon outcome={pull.latestReviewOutcome} />
                        <span>{pull.latestReviewOutcome ?? 'pending'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BentoPanel>
      </div>
    </DashboardLayout>
  );
}
