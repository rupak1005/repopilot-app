import type { RepositoryIndexStatus } from './indexStatus';

export function indexStateLabel(state: RepositoryIndexStatus['state'] | undefined): string {
  switch (state) {
    case 'ready':
      return 'Ready';
    case 'indexing':
      return 'Indexing';
    case 'failed':
      return 'Failed';
    case 'not_indexed':
      return 'Not indexed';
    default:
      return 'Unknown';
  }
}

/** Re-index is allowed unless a job is already running. */
export function canRequestReindex(
  status: RepositoryIndexStatus | null,
  indexingInProgress: boolean
): boolean {
  if (indexingInProgress) return false;
  if (status?.state === 'indexing') return false;
  return true;
}
