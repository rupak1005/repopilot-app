import { deriveRepositoryId } from '@repopilot/common';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { BentoPanel } from '../../../components/ui/BentoPanel';
import { DashboardLayout } from '../../../lib/dashboard';
import { API_BASE, MARKETING_URL } from '../../../lib/types';
import type { PublicUser } from '../../../lib/session';

export default function SettingsPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const [user, setUser] = useState<PublicUser | null>(null);

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

  return (
    <DashboardLayout activeNav="settings">
      <div className="canvas-inner canvas-inner--narrow">
        <div className="page-title-block">
          <h1>Settings</h1>
          <p>Session and repository identifiers.</p>
        </div>

        <div className="ui-settings-stack">
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
              <dd>{derivedId ?? '—'}</dd>
              <dt>API base</dt>
              <dd>{API_BASE}</dd>
            </dl>
          </BentoPanel>

          <BentoPanel title="Links">
            <p className="settings-links">
              <a href={MARKETING_URL}>Marketing site</a>
              <Link href="/repos">Switch repository</Link>
            </p>
          </BentoPanel>
        </div>
      </div>
    </DashboardLayout>
  );
}
