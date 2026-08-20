import Link from 'next/link';
import { DocsCode, DocsLayout, DocsSection } from '../../components/ui/DocsLayout';
import { GITHUB_SIGN_IN_URL } from '../../lib/auth';
import { ONBOARDING_STEPS } from '../../lib/docsOnboarding';
import { EXAMPLE_REPOS } from '../../lib/exampleRepos';

export default function DocsGettingStartedPage() {
  return (
    <DocsLayout
      slug="getting-started"
      title="Getting started"
      lede="Open a repository, wait for indexing to finish, then use Overview, Search, Ask, Architecture, Impact, Topography, History, and Settings."
    >
      <DocsSection title="First-run checklist">
        <ol className="docs-onboarding-list">
          {ONBOARDING_STEPS.map((step, index) => (
            <li key={step.id}>
              <strong>
                {index + 1}. {step.title}
              </strong>
              <p>{step.detail}</p>
              <p>
                <Link href={step.href}>Continue →</Link>
              </p>
            </li>
          ))}
        </ol>
      </DocsSection>

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
            <Link href="/repos">Repositories</Link>, then open <strong>Settings</strong> and click{' '}
            <strong>Re-index repository</strong> if needed.
          </li>
        </ol>
      </DocsSection>

      <DocsSection title="Dashboard tour">
        <h3>Overview</h3>
        <p>
          Index-aware pulse board with file counts, open PRs, and hotspots. Quick actions jump to Ask, Search,
          Dependency Graph, Impact, and History. Use <strong>Index settings</strong> to re-index.
        </p>

        <h3>Dependency Graph</h3>
        <p>
          Real import edges with directory clustering, path tracing, neighborhood expand, import-cycle inspector,
          and blast overlay from Impact (<code>?file=&amp;blast=1</code>).
        </p>

        <h3>Topography</h3>
        <p>
          2D directory landscape sized by hotspot score, churn, dependents, or findings — with 7d / 30d / 90d / 1y
          lookbacks.
        </p>

        <h3>Search</h3>
        <p>
          Hybrid lexical + semantic search. Each hit has Graph / Impact / GitHub citation actions when a repo is
          selected.
        </p>

        <h3>Ask RepoPilot</h3>
        <p>
          Natural-language answers with file:line citations. Open Graph, Impact, or GitHub from any citation chip.
          Requires an LLM provider (<code>GROQ_API_KEY</code>, <code>GEMINI_API_KEY</code>, or local Ollama) in{' '}
          <code>api/.env</code>.
        </p>

        <h3>Impact</h3>
        <p>
          File, symbol, or PR blast radius with risk factors, confidence, and a map. Deep-link into the architecture
          canvas with blast highlighting.
        </p>

        <h3>History</h3>
        <p>Indexed revision SHAs plus commit / PR history search from ingested git data.</p>

        <h3>Pull Requests</h3>
        <p>
          Review findings with severity filters; changed files link to Impact and Graph. Similar PRs link through to
          other pull details.
        </p>

        <h3>Settings &amp; MCP</h3>
        <p>
          Live index health, re-index controls, and MCP setup with repo-scoped tool examples for agent clients.
        </p>
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
          Progress appears in the floating index pill and on Overview / Settings. Demo mode (
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
