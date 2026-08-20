import { isDemoMode } from './demoMode';
import { isRepoIndexInProgress, type RepositoryIndexStatus } from './indexStatus';
import type { HotspotRow, PullRequestRow, RepositoryAnalytics } from './types';

export function showIndexHint(
  pulls: PullRequestRow[],
  hotspots: HotspotRow[],
  analytics: RepositoryAnalytics | null
): boolean {
  if (isDemoMode()) return false;
  const empty =
    pulls.length === 0 &&
    hotspots.length === 0 &&
    (analytics?.totalReviews ?? 0) === 0;
  return empty;
}

export function shouldShowIndexHint(
  pulls: PullRequestRow[],
  hotspots: HotspotRow[],
  analytics: RepositoryAnalytics | null,
  indexStatus: RepositoryIndexStatus | null,
  repoId?: string | null,
  pendingIndexJobRepoId?: string | null
): boolean {
  // Wait for first status poll — null looked like "Indexing" and flashed the empty hint.
  if (!indexStatus) return false;
  if (isRepoIndexInProgress(repoId ?? null, indexStatus, pendingIndexJobRepoId)) return false;
  return showIndexHint(pulls, hotspots, analytics);
}
