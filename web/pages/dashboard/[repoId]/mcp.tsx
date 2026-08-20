import { useRouter } from 'next/router';
import { McpConnectPanel } from '../../../components/ui/McpConnectPanel';
import { IndexHint } from '../../../components/ui/IndexHint';
import { useDashboardContext, useNeedsIndexHint } from '../../../lib/dashboard';

export default function DashboardMcpPage() {
  const router = useRouter();
  const repoId = typeof router.query.repoId === 'string' ? router.query.repoId : null;
  const ctx = useDashboardContext();
  const needsIndex = useNeedsIndexHint(repoId);

  return (
    <div className="canvas-inner canvas-inner--mcp">
      <div className="page-title-block">
        <h1>MCP for agents</h1>
        <p>
          Connect Cursor or any MCP client to this indexed repo — copy the config, then use search,
          impact, and Ask tools against live Postgres data.
        </p>
      </div>

      {needsIndex ? <IndexHint repoFullName={ctx?.repoFullName} /> : null}

      <McpConnectPanel
        context={{
          repositoryId: repoId ?? undefined,
          repoSlug: ctx?.repoFullName
        }}
      />
    </div>
  );
}
