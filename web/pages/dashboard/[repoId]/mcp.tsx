import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { McpConnectPanel } from '../../../components/ui/McpConnectPanel';
import { DashboardLayout } from '../../../lib/dashboard';
import type { PublicUser } from '../../../lib/session';

export default function DashboardMcpPage() {
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

  return (
    <DashboardLayout activeNav="overview">
      <div className="canvas-inner canvas-inner--narrow">
        <div className="page-title-block">
          <h1>Connect Cursor / MCP</h1>
          <p>
            Give coding agents access to this indexed repository — search, impact, dependencies,
            history, and Ask tools backed by real Postgres data.
          </p>
        </div>

        <McpConnectPanel
          context={{
            repositoryId: repoId ?? undefined,
            repoSlug: user?.selectedRepoFullName
          }}
        />
      </div>
    </DashboardLayout>
  );
}
