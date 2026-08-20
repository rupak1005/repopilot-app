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
    <DashboardLayout activeNav="mcp">
      <div className="canvas-inner canvas-inner--mcp">
        <div className="page-title-block">
          <h1>MCP for agents</h1>
          <p>
            Connect Cursor or any MCP client to this indexed repo — copy the config, then use
            search, impact, and Ask tools against live Postgres data.
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
