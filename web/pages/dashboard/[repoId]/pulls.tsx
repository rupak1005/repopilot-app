import { useRouter } from 'next/router';
import { DashboardLayout, useRepoData } from '../../../lib/dashboard';
import { Icon } from '../../../components/Icon';
import { StatusBadge, reviewStatusVariant } from '../../../components/ui/StatusBadge';

function outcomeIconName(outcome: string | null): string {
  switch (outcome) {
    case 'PASS':
      return 'check_circle';
    case 'FAIL':
      return 'cancel';
    case 'WARN':
      return 'warning';
    default:
      return 'pending';
  }
}

export default function PullsPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { pulls, error, loading } = useRepoData(repoId);

  return (
    <DashboardLayout activeNav="pulls">
      <div className="canvas-inner">
        <div className="page-title-block">
          <h1>Pull Requests</h1>
          <p>Review status and outcomes.</p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {loading ? <p className="empty-state">Loading pull requests…</p> : null}

        <section className="panel">
          <div className="panel-header">
            <h2>All Pull Requests</h2>
          </div>
          {pulls.length === 0 ? (
            <p className="empty-state" style={{ padding: 16 }}>
              No pull requests indexed yet.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                    <tr key={pull.pullNumber}>
                      <td className="mono">#{pull.pullNumber}</td>
                      <td>{pull.title}</td>
                      <td>{pull.status}</td>
                      <td>
                        <StatusBadge variant={reviewStatusVariant(pull.latestReviewStatus)}>
                          {(pull.latestReviewStatus ?? 'none').toUpperCase()}
                        </StatusBadge>
                      </td>
                      <td>
                        <Icon name={outcomeIconName(pull.latestReviewOutcome)} size={16} />
                        {' '}
                        {pull.latestReviewOutcome ?? 'pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
