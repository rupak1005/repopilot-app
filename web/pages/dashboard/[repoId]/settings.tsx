import { deriveRepositoryId } from '@repopilot/common';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
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
    <DashboardLayout title="Settings" subtitle="Session and repository identifiers.">
      <section className="card">
        <h2>Account</h2>
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

      <section className="card">
        <h2>Repository</h2>
        <dl className="settings-dl">
          <dt>GitHub full name</dt>
          <dd>{fullName || '—'}</dd>
          <dt>RepoPilot ID</dt>
          <dd>{derivedId ?? '—'}</dd>
          <dt>API base</dt>
          <dd>{API_BASE}</dd>
        </dl>
        <p className="empty-state" style={{ marginTop: 16 }}>
          Index this repo via CLI/API if dashboard pages show &quot;not indexed&quot; errors.
        </p>
      </section>

      <section className="card">
        <h2>Links</h2>
        <p>
          <a href={MARKETING_URL}>Marketing site</a>
          {' · '}
          <a href="/repos">Switch repository</a>
        </p>
      </section>
    </DashboardLayout>
  );
}
