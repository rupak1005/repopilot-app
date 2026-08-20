import Link from 'next/link';
import { DocsCode, DocsLayout, DocsSection } from '../../components/ui/DocsLayout';
import { GITHUB_SIGN_IN_URL } from '../../lib/auth';
import { EXAMPLE_REPOS } from '../../lib/exampleRepos';

export default function DocsGettingStartedPage() {
  return (
    <DocsLayout
      slug="getting-started"
      title="Getting started"
      lede="Open a repository, wait for indexing to finish, then use search, Ask, architecture, and impact views."
    >
      <DocsSection title="Analyze a public repository">
        <ol>
          <li>
            Go to the <Link href="/">home page</Link> and paste a GitHub URL or <code>owner/repo</code> slug.
          </li>
          <li>
            RepoPilot registers the repository, clones or reads files, and starts indexing in the background.
          </li>
          <li>
            When indexing completes, you land on the dashboard at{' '}
            <code>/dashboard/&lt;repository-id&gt;</code>.
          </li>
        </ol>
        <p>Example repositories you can try:</p>
        <ul>
          {EXAMPLE_REPOS.map((repo) => (
            <li key={repo.slug}>
              <Link href={`/${repo.slug}`}>{repo.slug}</Link>
            </li>
          ))}
        </ul>
      </DocsSection>

      <DocsSection title="Connect GitHub (private repos)">
        <ol>
          <li>
            Create a GitHub OAuth App with callback URL{' '}
            <code>http://localhost:3000/api/auth/callback/github</code> (or your deployed app URL).
          </li>
          <li>
            Set <code>GITHUB_CLIENT_ID</code>, <code>GITHUB_CLIENT_SECRET</code>, and{' '}
            <code>SESSION_SECRET</code> in <code>web/.env.local</code>.
          </li>
          <li>
            <Link href={GITHUB_SIGN_IN_URL}>Sign in with GitHub</Link>, pick a repository from{' '}
            <Link href="/repos">Repositories</Link>, and trigger indexing from Settings.
          </li>
        </ol>
      </DocsSection>

      <DocsSection title="Dashboard tour">
        <h3>Overview</h3>
        <p>KPI tiles for files, symbols, dependencies, and index status. Jump to any feature from the sidebar.</p>

        <h3>Search</h3>
        <p>
          Hybrid lexical + semantic search over indexed code chunks. Results include file paths, line ranges, and
          relevance scores.
        </p>

        <h3>Ask RepoPilot</h3>
        <p>
          Natural-language questions answered with citations (file + line evidence). Requires an LLM provider
          (<code>GROQ_API_KEY</code>, <code>GEMINI_API_KEY</code>, or local Ollama) in <code>api/.env</code>.
        </p>

        <h3>Architecture</h3>
        <p>
          Module dependency graph rendered with Mermaid or force-directed layout. Built from real import edges, not
          LLM guesses.
        </p>

        <h3>Impact</h3>
        <p>Pick a file and see downstream modules and symbols that depend on it — useful before refactors or merges.</p>

        <h3>Hotspots</h3>
        <p>Modules ranked by commit churn from ingested git history.</p>

        <h3>Pull Requests</h3>
        <p>Review findings with evidence links when GitHub webhooks and tokens are configured.</p>
      </DocsSection>

      <DocsSection title="Indexing stages">
        <p>Full indexing runs these stages in order:</p>
        <ol>
          <li>
            <strong>Sync</strong> — parse files with Tree-sitter; extract symbols, imports, exports
          </li>
          <li>
            <strong>Graph</strong> — resolve module and symbol dependency edges
          </li>
          <li>
            <strong>Search</strong> — chunk files, embed text, store vectors in pgvector
          </li>
          <li>
            <strong>History</strong> — ingest recent commits for hotspots and co-change analysis
          </li>
        </ol>
        <p>
          Progress appears in the floating index pill and on the Overview page. Demo mode (
          <code>NEXT_PUBLIC_DEMO_MODE=true</code>) skips live indexing and shows seeded UI data.
        </p>
      </DocsSection>

      <DocsSection title="CLI indexing (advanced)">
        <p>For local repos or CI, index from the command line:</p>
        <DocsCode>{`./scripts/index-repo.sh owner/repo [path-to-clone]

# Opens dashboard at /dashboard/<derived-id>`}</DocsCode>
      </DocsSection>
    </DocsLayout>
  );
}
