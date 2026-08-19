import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { GITHUB_SIGN_IN_URL } from '../lib/auth';
import { McpConnectPanel } from '../components/ui/McpConnectPanel';
import { PublicPageLayout } from '../components/ui/PublicPageLayout';

export default function PublicMcpPage() {
  const router = useRouter();
  const [repoId, setRepoId] = useState<string | null>(null);
  const [repoSlug, setRepoSlug] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return;
      const user = (await response.json()) as {
        selectedRepoId?: string;
        selectedRepoFullName?: string;
      };
      if (user.selectedRepoId) setRepoId(user.selectedRepoId);
      if (user.selectedRepoFullName) setRepoSlug(user.selectedRepoFullName);
    }
    void load();
  }, [router.asPath]);

  const context =
    repoId || repoSlug
      ? { repositoryId: repoId ?? undefined, repoSlug: repoSlug ?? undefined }
      : undefined;

  return (
    <PublicPageLayout
      active="home"
      pageClassName="mcp-page"
      mainClassName="mcp-page__main"
      shellClassName="mcp-page__shell"
    >
          <div className="page-title-block">
            <h1>Connect Cursor / MCP</h1>
            <p>
              Wire RepoPilot into Cursor, Claude Desktop, or any MCP client so agents can search,
              trace dependencies, and run impact analysis on your indexed repo.
            </p>
          </div>

          {!context ? (
            <p className="mcp-page__notice">
              <Link href="/">Analyze a public repo</Link> or{' '}
              <Link href={GITHUB_SIGN_IN_URL}>connect GitHub</Link> first — step 3 fills in your repository ID
              automatically.
            </p>
          ) : (
            <p className="mcp-page__notice">
              Config below is prefilled for your current session.{' '}
              <Link href={`/dashboard/${repoId}/mcp`}>Open dashboard view →</Link>
            </p>
          )}

          <McpConnectPanel context={context} />
    </PublicPageLayout>
  );
}
