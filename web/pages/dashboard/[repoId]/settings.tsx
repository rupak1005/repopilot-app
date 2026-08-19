import { deriveRepositoryId } from '@repopilot/common';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      <div className="canvas-inner" style={{ maxWidth: 640 }}>
        <div className="page-title-block">
          <h1>Settings</h1>
          <p>Session and repository identifiers.</p>
        </div>

        <section className="panel" style={{ padding: 20, marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Account</h2>
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
        </section>

        <section className="panel" style={{ padding: 20, marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Repository</h2>
          <dl className="settings-dl">
            <dt>GitHub full name</dt>
            <dd>{fullName || '—'}</dd>
            <dt>RepoPilot ID</dt>
            <dd>{derivedId ?? '—'}</dd>
            <dt>API base</dt>
            <dd>{API_BASE}</dd>
          </dl>
        </section>

        <section className="panel" style={{ padding: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>Links</h2>
          <p style={{ margin: 0 }}>
            <a href={MARKETING_URL}>Marketing site</a>
            {' · '}
            <Link href="/repos">Switch repository</Link>
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
