import { deriveRepositoryId } from '@repopilot/common';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { Button } from '../../../components/ui/Button';
import { ErrorBanner } from '../../../components/ui/ErrorBanner';
import { StatusBadge, type StatusBadgeVariant } from '../../../components/ui/StatusBadge';
import { useToast } from '../../../components/ui/ToastProvider';
import {
  DashboardLayout,
  usePendingIndexJobRepoId,
  useRepoIndexStatus
} from '../../../lib/dashboard';
import { isDemoMode } from '../../../lib/demoMode';
import { canRequestReindex, indexStateLabel } from '../../../lib/indexSettings';
import {
  indexStatusLabel,
  isRepoIndexInProgress,
  type RepositoryIndexStatus
} from '../../../lib/indexStatus';
import { useIndexProgressUi } from '../../../lib/indexProgressUi';
import type { PublicUser } from '../../../lib/session';
import { API_BASE, MARKETING_URL } from '../../../lib/types';

function indexBadgeVariant(state: RepositoryIndexStatus['state'] | undefined): StatusBadgeVariant {
  switch (state) {
    case 'ready':
      return 'success';
    case 'indexing':
      return 'warn';
    case 'failed':
      return 'fail';
    default:
      return 'muted';
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const [user, setUser] = useState<PublicUser | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { startIndexProgress } = useIndexProgressUi();
  const indexStatus = useRepoIndexStatus(repoId);
  const pendingIndexJobRepoId = usePendingIndexJobRepoId();
  const indexingInProgress = isRepoIndexInProgress(repoId, indexStatus, pendingIndexJobRepoId);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        setUser((await response.json()) as PublicUser);
      }
    }
    void load();
  }, []);

  const fullName = user?.selectedRepoFullName ?? '';
  const derivedId = fullName ? deriveRepositoryId(fullName) : repoId;
  const base = repoId ? `/dashboard/${repoId}` : '';
  const allowReindex = canRequestReindex(indexStatus, indexingInProgress) && !reindexing;

  async function copyRepoId() {
    if (!derivedId) return;
    try {
      await navigator.clipboard.writeText(derivedId);
      toast('Repo ID copied', { variant: 'success' });
    } catch {
      toast('Could not copy', { variant: 'error' });
    }
  }

  async function requestReindex() {
    if (!repoId || !fullName || !allowReindex) return;
    if (isDemoMode()) {
      toast('Demo mode — re-index is skipped', { variant: 'info' });
      return;
    }
    setReindexing(true);
    setError(null);
    try {
      const response = await fetch(`/api/repositories/${repoId}/index`, { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Could not start re-index');
      }
      startIndexProgress({ repoId, fullName });
      toast('Re-index queued', { variant: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-index failed');
    } finally {
      setReindexing(false);
    }
  }

  return (
    <DashboardLayout activeNav="settings">
      <div className="canvas-inner canvas-inner--narrow">
        <div className="page-title-block">
          <h1>Settings</h1>
          <p>Session, repository identity, and index health.</p>
        </div>

        {error ? <ErrorBanner onDismiss={() => setError(null)}>{error}</ErrorBanner> : null}

        <div className="ui-settings-stack">
          <BentoPanel title="Index health">
            <div className="ui-settings-index">
              <div className="ui-settings-index__row">
                <StatusBadge variant={indexBadgeVariant(indexStatus?.state)}>
                  {indexStateLabel(indexStatus?.state)}
                </StatusBadge>
                <span className="ui-settings-index__detail">
                  {indexStatus ? indexStatusLabel(indexStatus) : 'Waiting for status…'}
                </span>
              </div>
              <dl className="settings-dl">
                <dt>Revision</dt>
                <dd className="mono">
                  {indexStatus?.revisionSha ? indexStatus.revisionSha.slice(0, 12) : '—'}
                </dd>
                <dt>Files / symbols</dt>
                <dd>
                  {indexStatus
                    ? `${indexStatus.fileCount.toLocaleString()} / ${indexStatus.symbolCount.toLocaleString()}`
                    : '—'}
                </dd>
                {indexStatus?.job?.lastError ? (
                  <>
                    <dt>Last error</dt>
                    <dd className="ui-settings-index__error">{indexStatus.job.lastError}</dd>
                  </>
                ) : null}
              </dl>
              <div className="ui-settings-index__actions">
                <Button
                  variant="primary"
                  disabled={!allowReindex || !repoId || !fullName}
                  onClick={() => void requestReindex()}
                >
                  {reindexing || indexingInProgress ? 'Indexing…' : 'Re-index repository'}
                </Button>
                {base ? (
                  <Link className="ui-settings-index__link" href={`${base}/history`}>
                    View history →
                  </Link>
                ) : null}
              </div>
            </div>
          </BentoPanel>

          <BentoPanel title="Account">
            {user ? (
              <dl className="settings-dl">
                <dt>GitHub login</dt>
                <dd>{user.login}</dd>
                <dt>Display name</dt>
                <dd>{user.name ?? '—'}</dd>
              </dl>
            ) : (
              <p className="empty-state">Loading…</p>
            )}
          </BentoPanel>

          <BentoPanel title="Repository">
            <dl className="settings-dl">
              <dt>GitHub full name</dt>
              <dd>{fullName || '—'}</dd>
              <dt>RepoPilot ID</dt>
              <dd className="ui-settings-id-row">
                <span className="mono">{derivedId ?? '—'}</span>
                {derivedId ? (
                  <button type="button" className="ui-settings-copy" onClick={() => void copyRepoId()}>
                    Copy
                  </button>
                ) : null}
              </dd>
              <dt>API base</dt>
              <dd className="mono">{API_BASE}</dd>
            </dl>
          </BentoPanel>

          <BentoPanel title="Links">
            <p className="settings-links">
              <Link href="/repos">Switch repository</Link>
              {base ? <Link href={`${base}/mcp`}>MCP setup</Link> : null}
              <a href={MARKETING_URL}>Marketing site</a>
            </p>
          </BentoPanel>
        </div>
      </div>
    </DashboardLayout>
  );
}
