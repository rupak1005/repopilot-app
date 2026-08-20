import Link from 'next/link';
import { DocsCode, DocsLayout, DocsSection } from '../../components/ui/DocsLayout';
import { McpConnectPanel } from '../../components/ui/McpConnectPanel';

export default function DocsMcpPage() {
  return (
    <DocsLayout
      slug="mcp"
      title="MCP for agents"
      lede="Expose RepoPilot tools to Cursor, Claude Desktop, or any MCP client over stdio."
    >
      <DocsSection title="What MCP provides">
        <p>
          The MCP server lets coding agents search your indexed repository, trace dependencies, run impact analysis,
          and ask questions — without leaving the editor. Tools call the same REST API the dashboard uses.
        </p>
      </DocsSection>

      <DocsSection title="Run the MCP server">
        <DocsCode>{`# Build API first
yarn --cwd api build

# Set repo context in api/.env (pick one):
MCP_REPO_SLUG=owner/repo
# MCP_REPOSITORY_ID=<uuid-from-dashboard-url>

# Optional auth when API requires it:
# MCP_API_KEY=<shared-secret>

yarn --cwd api mcp`}</DocsCode>
      </DocsSection>

      <DocsSection title="Cursor configuration">
        <p>Add to Cursor MCP settings (stdio transport):</p>
        <DocsCode>{`{
  "mcpServers": {
    "repopilot": {
      "command": "node",
      "args": ["/path/to/repoPilot/api/dist/mcp/server.js"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "MCP_REPO_SLUG": "owner/repo"
      }
    }
  }
}`}</DocsCode>
        <p>
          Or use the interactive setup panel below — it generates config snippets with your repository ID prefilled
          when signed in.
        </p>
      </DocsSection>

      <DocsSection title="Interactive setup">
        <McpConnectPanel />
        <p className="docs-callout">
          Prefer the standalone page? <Link href="/mcp">Open /mcp →</Link>
        </p>
      </DocsSection>

      <DocsSection title="Available tools">
        <ul>
          <li>Search code chunks (lexical + semantic)</li>
          <li>Query module and symbol dependencies</li>
          <li>Impact analysis for a file path</li>
          <li>Ask questions with file/line citations</li>
          <li>Read architecture graph summaries</li>
        </ul>
        <p>
          Ensure the repository is fully indexed before using MCP tools. Run{' '}
          <Link href="/docs/getting-started">Getting started</Link> steps or{' '}
          <code>./scripts/index-repo.sh</code> first.
        </p>
      </DocsSection>
    </DocsLayout>
  );
}
