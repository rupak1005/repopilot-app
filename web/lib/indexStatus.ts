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

export function indexStatusLabel(status: RepositoryIndexStatus | null): string {
  if (!status) return 'Indexing';
  switch (status.state) {
    case 'indexing':
      return 'Indexing…';
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
