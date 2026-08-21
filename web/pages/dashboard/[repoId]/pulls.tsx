import Link from 'next/link';
import { useRouter } from 'next/router';
import { GitPullRequest } from '@phosphor-icons/react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { IndexHint } from '../../../components/ui/IndexHint';
import { OutcomeIcon } from '../../../components/ui/OutcomeIcon';
import { StatusBadge, reviewStatusVariant } from '../../../components/ui/StatusBadge';
import { rowLinkProps } from '../../../lib/a11y';
import { shouldShowIndexHint, useDashboardContext, usePendingIndexJobRepoId, useRepoData, useRepoIndexStatus } from '../../../lib/dashboard';
import { PageLoading } from '../../../components/ui/Skeleton';
export default function PullsPage() {
  const router = useRouter();
  const dash = useDashboardContext();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const repoFullName = dash?.repoFullName;
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
  const githubPullsHref = repoFullName ? `https://github.com/${repoFullName}/pulls` : null;

  return (
    <div className="canvas-inner">
        <div className="page-title-block">
          <h1>Pull Requests</h1>
          <p>Review status and outcomes.</p>
        </div>

        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {needsIndex ? <IndexHint /> : null}
        {loading ? <PageLoading label="Loading pull requests…" /> : null}

        <BentoPanel title="All Pull Requests">
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
                      {...rowLinkProps(() => void router.push(`${base}/pulls/${pull.pullNumber}`))}
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
  );
}
