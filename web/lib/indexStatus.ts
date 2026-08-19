import { useEffect, useState } from 'react';

export type RepositoryIndexStatus = {
  state: 'not_indexed' | 'indexing' | 'ready' | 'failed';
  revisionSha: string | null;
  fileCount: number;
  symbolCount: number;
  job: { lastError: string | null } | null;
};

export function useIndexStatus(repoId: string | null, enabled: boolean) {
  const [status, setStatus] = useState<RepositoryIndexStatus | null>(null);

  useEffect(() => {
    if (!repoId || !enabled) {
      setStatus(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/repositories/${repoId}`);
        if (!response.ok || cancelled) return;
        setStatus((await response.json()) as RepositoryIndexStatus);
      } catch {
        // ponytail: topbar pill falls back to generic label
      }
    }

    void load();
    const intervalMs = status?.state === 'indexing' ? 3000 : 12000;
    const timer = window.setInterval(() => void load(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [repoId, enabled, status?.state]);

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
