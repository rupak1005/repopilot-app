import { useEffect, useState } from 'react';

export type IndexStage = 'clone' | 'parse' | 'graph' | 'history' | 'ready' | 'failed';

export type RepositoryIndexStatus = {
  state: 'not_indexed' | 'indexing' | 'ready' | 'failed';
  stage: IndexStage;
  revisionSha: string | null;
  fileCount: number;
  symbolCount: number;
  moduleDependencyCount?: number;
  job: { lastError: string | null } | null;
};

export const indexProgressSteps: Array<{ id: Exclude<IndexStage, 'failed'>; label: string }> = [
  { id: 'clone', label: 'Clone repository' },
  { id: 'parse', label: 'Parse source files' },
  { id: 'graph', label: 'Build dependency graph' },
  { id: 'history', label: 'Analyze git history' },
  { id: 'ready', label: 'Ready to explore' }
];

const INDEX_STAGE_BOUNDS: Record<
  Exclude<IndexStage, 'failed' | 'ready'>,
  { floor: number; ceiling: number }
> = {
  clone: { floor: 2, ceiling: 12 },
  parse: { floor: 12, ceiling: 52 },
  graph: { floor: 52, ceiling: 74 },
  history: { floor: 74, ceiling: 98 }
};

/** Heuristic 1–99% from pipeline stage + DB counts (ponytail: not byte-accurate). */
export function indexProgressPercent(status: RepositoryIndexStatus | null): number | null {
  if (!status) return null;
  if (status.state === 'ready' || status.stage === 'ready') return 100;
  if (status.state === 'failed' || status.stage === 'failed') return null;
  if (status.state !== 'indexing') return null;

  const stage = status.stage as Exclude<IndexStage, 'failed' | 'ready'>;
  const bounds = INDEX_STAGE_BOUNDS[stage];
  if (!bounds) return null;

  let ratio = 0.35;

  if (stage === 'clone') {
    ratio = status.fileCount > 0 ? 0.9 : 0.25;
  } else if (stage === 'parse') {
    if (status.symbolCount > 0) ratio = 0.85;
    else if (status.fileCount > 0) {
      ratio = Math.min(0.75, 0.2 + Math.log10(status.fileCount + 1) / 4);
    } else {
      ratio = 0.15;
    }
  } else if (stage === 'graph') {
    ratio =
      (status.moduleDependencyCount ?? 0) > 0
        ? 0.9
        : status.symbolCount > 0
          ? 0.45
          : 0.2;
  } else if (stage === 'history') {
    ratio = (status.moduleDependencyCount ?? 0) > 0 ? 0.55 : 0.2;
  }

  const pct = bounds.floor + (bounds.ceiling - bounds.floor) * ratio;
  return Math.round(Math.max(1, Math.min(99, pct)));
}

/** Max animated percent while a long-running stage completes (ponytail: creeps toward this). */
export function indexStageProgressCap(status: RepositoryIndexStatus | null): number | null {
  if (!status || status.state !== 'indexing') return indexProgressPercent(status);
  const stage = status.stage as Exclude<IndexStage, 'failed' | 'ready'>;
  const bounds = INDEX_STAGE_BOUNDS[stage];
  if (!bounds) return 99;
  return bounds.ceiling - 1;
}

/** Smooth bar motion between SSE polls when counts are unchanged. */
export function useAnimatedIndexProgress(status: RepositoryIndexStatus | null): number | null {
  const base = indexProgressPercent(status);
  const [display, setDisplay] = useState<number | null>(base);

  useEffect(() => {
    if (base === null) {
      setDisplay(null);
      return;
    }
    setDisplay((prev) => (prev === null ? base : Math.max(prev, base)));
  }, [base, status?.stage, status?.fileCount, status?.symbolCount, status?.moduleDependencyCount]);

  useEffect(() => {
    if (status?.state !== 'indexing' || base === null) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cap = indexStageProgressCap(status) ?? 99;
    const intervalMs = reducedMotion ? 2000 : 450;

    const timer = window.setInterval(() => {
      setDisplay((prev) => {
        if (prev === null) return base;
        if (prev >= cap) return prev;
        const step = Math.max(0.35, (cap - prev) * (reducedMotion ? 0.12 : 0.09));
        return Math.min(cap, prev + step);
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [status?.state, status?.stage, base, status]);

  if (status?.state === 'ready' || status?.stage === 'ready') return 100;
  if (display === null) return base;
  return Math.round(display);
}

export function parseIndexStreamPayload(raw: string): RepositoryIndexStatus | null {
  try {
    return JSON.parse(raw) as RepositoryIndexStatus;
  } catch {
    return null;
  }
}

async function fetchIndexStatus(repoId: string): Promise<RepositoryIndexStatus | null> {
  try {
    const response = await fetch(`/api/repositories/${repoId}/index`);
    if (!response.ok) return null;
    return (await response.json()) as RepositoryIndexStatus;
  } catch {
    return null;
  }
}

export function useIndexStatus(
  repoId: string | null,
  enabled: boolean,
  pollMs?: number
) {
  const [status, setStatus] = useState<RepositoryIndexStatus | null>(null);

  useEffect(() => {
    if (!repoId || !enabled) {
      setStatus(null);
      return;
    }

    const id = repoId;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let eventSource: EventSource | undefined;

    function startPolling(intervalMs: number) {
      async function load() {
        const next = await fetchIndexStatus(id);
        if (!cancelled && next) setStatus(next);
      }
      void load();
      pollTimer = setInterval(() => void load(), intervalMs);
    }

    const useStream = typeof pollMs === 'number' && typeof EventSource !== 'undefined';

    if (useStream) {
      eventSource = new EventSource(`/api/repositories/${id}/index/stream`);
      eventSource.onmessage = (event) => {
        if (cancelled) return;
        const next = parseIndexStreamPayload(event.data);
        if (next) setStatus(next);
      };
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = undefined;
        if (!cancelled && !pollTimer) startPolling(pollMs);
      };
    } else {
      const intervalMs = pollMs ?? 12000;
      startPolling(intervalMs);
    }

    return () => {
      cancelled = true;
      eventSource?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [repoId, enabled, pollMs]);

  return status;
}

/** True while SSE/poll reports indexing or a float job is still pending for this repo. */
export function isRepoIndexInProgress(
  repoId: string | null,
  status: RepositoryIndexStatus | null,
  pendingJobRepoId?: string | null
): boolean {
  if (!repoId) return false;
  if (status?.state === 'indexing') return true;
  if (status?.state === 'ready' || status?.state === 'failed') return false;
  return pendingJobRepoId === repoId;
}

export function indexStatusLabel(
  status: RepositoryIndexStatus | null,
  displayPercent?: number | null
): string {
  if (!status) return 'Indexing';
  switch (status.state) {
    case 'indexing': {
      const pct = displayPercent ?? indexProgressPercent(status);
      return pct !== null ? `Indexing ${pct}%` : 'Indexing…';
    }
    case 'ready':
      return status.revisionSha ? `Indexed ${status.revisionSha.slice(0, 7)}` : 'Indexed';
    case 'failed':
      return 'Index failed';
    case 'not_indexed':
      return 'Not indexed';
    default:
      return 'Indexing';
  }
}
