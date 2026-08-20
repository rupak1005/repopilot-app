import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { McpConnectPanel } from '../../../components/ui/McpConnectPanel';
import { PageLoading } from '../../../components/ui/Skeleton';
import { IndexHint } from '../../../components/ui/IndexHint';
import { DashboardLayout, useNeedsIndexHint } from '../../../lib/dashboard';
import type { PublicUser } from '../../../lib/session';

export default function DashboardMcpPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const [user, setUser] = useState<PublicUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const needsIndex = useNeedsIndexHint(repoId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/auth/me');
        if (!cancelled && response.ok) {
          setUser((await response.json()) as PublicUser);
        }
      } finally {
        if (!cancelled) setUserLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
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

        {needsIndex ? <IndexHint repoFullName={user?.selectedRepoFullName} /> : null}

        {!userLoaded ? (
          <PageLoading label="Loading MCP config…" />
        ) : (
          <McpConnectPanel
            context={{
              repositoryId: repoId ?? undefined,
              repoSlug: user?.selectedRepoFullName
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
