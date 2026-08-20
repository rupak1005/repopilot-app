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
  {
    name: 'search_codebase',
    description: 'Lexical + semantic code search with citations',
    dashboardPath: '/search'
  },
  {
    name: 'find_impact',
    description: 'Blast radius for a file change',
    dashboardPath: '/impact'
  },
  {
    name: 'trace_dependencies',
    description: 'Module dependency traversal from a file',
    dashboardPath: '/architecture'
  },
  {
    name: 'search_history',
    description: 'Git history search across indexed commits',
    dashboardPath: '/hotspots'
  },
  {
    name: 'ask_repository',
    description: 'Natural-language Q&A with evidence',
    dashboardPath: '/ask'
  },
  {
    name: 'get_context_pack',
    description: 'Structured context bundle for agent tasks',
    dashboardPath: '/architecture'
  }
] as const;

/** Example tool call text for the current repo context. */
export function mcpToolExample(
  toolName: (typeof MCP_TOOLS)[number]['name'],
  ctx: McpConnectContext
): string {
  const repo = ctx.repositoryId ?? ctx.repoSlug ?? 'REPO_ID';
  switch (toolName) {
    case 'search_codebase':
      return `search_codebase({ query: "auth middleware", repositoryId: "${repo}" })`;
    case 'find_impact':
      return `find_impact({ filePath: "src/auth.ts", repositoryId: "${repo}" })`;
    case 'trace_dependencies':
      return `trace_dependencies({ filePath: "src/auth.ts", repositoryId: "${repo}" })`;
    case 'search_history':
      return `search_history({ query: "migrate auth", repositoryId: "${repo}" })`;
    case 'ask_repository':
      return `ask_repository({ query: "How does login work?", repositoryId: "${repo}" })`;
    case 'get_context_pack':
      return `get_context_pack({ filePath: "src/auth.ts", question: "what breaks if this changes?", repositoryId: "${repo}" })`;
    default:
      return toolName;
  }
}

/** Clipboard-ready get_context_pack call for Impact / Planning handoff. */
export function mcpContextPackSnippet(
  ctx: McpConnectContext & { filePath: string; question?: string }
): string {
  const repo = ctx.repositoryId ?? ctx.repoSlug ?? 'REPO_ID';
  const question = ctx.question ?? 'what breaks if this file changes?';
  return `get_context_pack({ filePath: ${JSON.stringify(ctx.filePath)}, question: ${JSON.stringify(question)}, repositoryId: ${JSON.stringify(repo)} })`;
}

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
