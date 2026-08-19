export type McpConnectContext = {
  repositoryId?: string;
  repoSlug?: string;
};

export const MCP_SETUP_STEPS = [
  {
    id: 'index',
    title: 'Index the repository',
    body:
      'RepoPilot MCP reads from your indexed Postgres data. Open a repo in the dashboard and wait until indexing finishes before connecting an agent.'
  },
  {
    id: 'config',
    title: 'Add the MCP server to Cursor',
    body:
      'In your RepoPilot checkout, copy .cursor/mcp.json.example to .cursor/mcp.json (or merge the repopilot block into Cursor Settings → MCP).'
  },
  {
    id: 'env',
    title: 'Set environment variables',
    body:
      'Point DATABASE_URL at the same Neon database as api/.env. Set MCP_REPOSITORY_ID (from the dashboard URL) or MCP_REPO_SLUG (owner/repo). Optionally set MCP_API_KEY and pass apiKey in tool calls.'
  },
  {
    id: 'restart',
    title: 'Reload MCP in your editor',
    body:
      'Restart Cursor or run “MCP: Reload servers”. You should see repopilot with search, impact, dependency, history, ask, and context tools.'
  }
] as const;

export const MCP_TOOLS = [
  { name: 'search_codebase', description: 'Lexical + semantic code search with citations' },
  { name: 'find_impact', description: 'Blast radius for a file change' },
  { name: 'trace_dependencies', description: 'Module dependency traversal from a file' },
  { name: 'search_history', description: 'Git history search across indexed commits' },
  { name: 'ask_repository', description: 'Natural-language Q&A with evidence' },
  { name: 'get_context_pack', description: 'Structured context bundle for agent tasks' }
] as const;

export function buildMcpCursorConfig(ctx: McpConnectContext): string {
  const env: Record<string, string> = {
    DATABASE_URL: '<same as api/.env DATABASE_URL>',
    MCP_REPOSITORY_ID: ctx.repositoryId ?? '<dashboard repo id>',
    MCP_REPO_SLUG: ctx.repoSlug ?? 'owner/repo'
  };

  if (!ctx.repositoryId) {
    delete env.MCP_REPOSITORY_ID;
  }
  if (!ctx.repoSlug) {
    env.MCP_REPO_SLUG = 'owner/repo';
  }

  return JSON.stringify(
    {
      mcpServers: {
        repopilot: {
          command: 'yarn',
          args: ['workspace', '@repopilot/api', 'mcp'],
          env
        }
      }
    },
    null,
    2
  );
}
