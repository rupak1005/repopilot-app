import { useRouter } from 'next/router';
import { DashboardLayout, useRepoData } from '../../../lib/dashboard';
import { outcomeIcon } from '../../../lib/types';

export default function PullsPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const { pulls, error, loading } = useRepoData(repoId);

  return (
    <DashboardLayout title="Pull requests" subtitle="Review status and outcomes.">
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="empty-state">Loading pull requests…</p> : null}
      <section className="card">
        {pulls.length === 0 ? (
          <p className="empty-state">No pull requests indexed yet.</p>
        ) : (
          <table className="data-table">
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
                  <td>#{pull.pullNumber}</td>
                  <td>{pull.title}</td>
                  <td>{pull.status}</td>
                  <td>{pull.latestReviewStatus ?? 'none'}</td>
                  <td>
                    {outcomeIcon(pull.latestReviewOutcome)} {pull.latestReviewOutcome ?? 'pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </DashboardLayout>
  );
}
