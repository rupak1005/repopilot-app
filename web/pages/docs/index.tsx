import Link from 'next/link';
import { DocsLayout, DocsSection } from '../../components/ui/DocsLayout';
import { DIFFERENTIATOR_TAGLINE, REPO_PILOT_DIFFERENTIATORS } from '../../lib/differentiators';

export default function DocsIntroductionPage() {
  return (
    <DocsLayout
      slug="introduction"
      title="Introduction"
      lede="RepoPilot indexes Git repositories and turns them into engineering intelligence — real dependency graphs, search, impact analysis, and evidence-backed answers."
    >
      <DocsSection title="What RepoPilot does">
        <p>{DIFFERENTIATOR_TAGLINE}</p>
        <p>
          Paste any public GitHub URL on the home page, or connect GitHub to index private repositories.
          RepoPilot parses source files with Tree-sitter, builds module and symbol dependency graphs, indexes
          searchable code chunks with embeddings, and ingests git history for hotspot analysis.
        </p>
      </DocsSection>

      <DocsSection title="Core capabilities">
        <ul>
          {REPO_PILOT_DIFFERENTIATORS.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong> — {item.description}
            </li>
          ))}
        </ul>
      </DocsSection>

      <DocsSection title="How it is organized">
        <p>RepoPilot is a Yarn monorepo with three packages:</p>
        <ul>
          <li>
            <strong>@repopilot/web</strong> — Next.js dashboard and public marketing shell (port 3000)
          </li>
          <li>
            <strong>@repopilot/api</strong> — Fastify REST API, indexing pipeline, and MCP server (port 3001)
          </li>
          <li>
            <strong>@repopilot/common</strong> — shared types and GitHub URL helpers
          </li>
        </ul>
        <p>
          PostgreSQL (with pgvector) stores indexed data. Redis queues background index jobs. A separate worker
          process drains the queue in production; local dev can run indexing inline with{' '}
          <code>INDEX_INLINE=true</code>.
        </p>
      </DocsSection>

      <DocsSection title="Where to go next">
        <ul>
          <li>
            <Link href="/docs/getting-started">Getting started</Link> — checklist, first repo, and dashboard tour
          </li>
          <li>
            <Link href="/docs/development">Development</Link> — run the stack locally
          </li>
          <li>
            <Link href="/docs/architecture">Architecture</Link> — indexing pipeline and design trade-offs
          </li>
          <li>
            <Link href="/docs/mcp">MCP for agents</Link> — connect IDE agents to the same index
          </li>
        </ul>
      </DocsSection>
    </DocsLayout>
  );
}
