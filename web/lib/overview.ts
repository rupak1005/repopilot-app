import type { RepositoryIndexStatus } from './indexStatus';
import { indexStatusLabel } from './indexStatus';

export type OverviewAction = {
  id: string;
  label: string;
  path: string;
  primary?: boolean;
};

/** Primary jump targets from the overview pulse board. */
export const OVERVIEW_ACTIONS: OverviewAction[] = [
  { id: 'ask', label: 'Ask a question', path: '/ask', primary: true },
  { id: 'search', label: 'Search code', path: '/search' },
  { id: 'architecture', label: 'Dependency graph', path: '/architecture' },
  { id: 'impact', label: 'Impact analysis', path: '/impact' },
  { id: 'history', label: 'History', path: '/history' }
];

export function overviewPulse(args: {
  indexStatus: RepositoryIndexStatus | null;
  pullCount: number;
  hotspotCount: number;
}): { headline: string; detail: string } {
  const { indexStatus, pullCount, hotspotCount } = args;
  if (!indexStatus) {
    return {
      headline: 'Checking index status…',
      detail: 'Fetching whether this repo has been indexed yet.'
    };
  }
  if (indexStatus.state === 'not_indexed') {
    return {
      headline: 'Repository not indexed yet',
      detail: 'Index from Settings to unlock graph, impact, search, and Ask.'
    };
  }
  if (indexStatus.state === 'indexing') {
    return {
      headline: indexStatusLabel(indexStatus),
      detail: 'Dashboard panels fill in as parse, graph, and history stages finish.'
    };
  }
  if (indexStatus.state === 'failed') {
    return {
      headline: 'Index failed',
      detail: indexStatus.job?.lastError?.slice(0, 140) || 'Open Settings to retry re-index.'
    };
  }
  const sha = indexStatus.revisionSha ? indexStatus.revisionSha.slice(0, 7) : 'HEAD';
  return {
    headline: `Indexed @ ${sha}`,
    detail: `${indexStatus.fileCount.toLocaleString()} files · ${pullCount} open PR${
      pullCount === 1 ? '' : 's'
    } · ${hotspotCount} hotspot${hotspotCount === 1 ? '' : 's'}`
  };
}
