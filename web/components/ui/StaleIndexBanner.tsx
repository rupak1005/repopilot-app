import Link from 'next/link';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { isIndexStale, type RepositoryIndexStatus } from '../../lib/indexStatus';

type StaleIndexBannerProps = {
  repoId: string;
  status: RepositoryIndexStatus | null;
  demoMode?: boolean;
};

/** Soft banner when the indexed revision is behind GitHub default-branch HEAD. */
export function StaleIndexBanner({ repoId, status, demoMode }: StaleIndexBannerProps) {
  if (demoMode || !isIndexStale(status)) return null;

  const indexed = status?.revisionSha?.slice(0, 7) ?? '—';
  const remote = status?.remoteHeadSha?.slice(0, 7) ?? '—';

  return (
    <div className="ui-stale-banner" role="status" aria-live="polite">
      <ArrowsClockwise size={16} weight="bold" aria-hidden />
      <span>
        Indexed at <span className="mono">{indexed}</span> · GitHub HEAD{' '}
        <span className="mono">{remote}</span> is newer. Re-index to refresh engineering views.
      </span>
      <Link className="ui-stale-banner__action" href={`/dashboard/${repoId}/settings`}>
        Refresh index →
      </Link>
    </div>
  );
}
