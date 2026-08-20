import { DocsCode, DocsLayout, DocsSection, DocsTable } from '../../components/ui/DocsLayout';

export default function DocsArchitecturePage() {
  return (
    <DocsLayout
      slug="architecture"
      title="Architecture"
      lede="How RepoPilot indexes repositories, stores graph data, and serves intelligence features."
    >
      <DocsSection title="High-level flow">
        <DocsCode>{`GitHub URL / local path
       ↓
  clone or read files
       ↓
  syncRepository (Tree-sitter parse)
       ↓
  buildDependencyGraph
       ↓
  indexRepositorySearch (chunks + embeddings)
       ↓
  ingestRepositoryHistory (git log)
       ↓
  Dashboard + REST API + MCP tools`}</DocsCode>
      </DocsSection>

      <DocsSection title="Technology stack">
        <DocsTable
          headers={['Layer', 'Technology', 'Role']}
          rows={[
            ['Web UI', 'Next.js (Pages Router), React, Motion', 'Dashboard, BFF auth routes, public shell'],
            ['API', 'Fastify, Zod', 'REST endpoints, webhooks, rate limiting'],
            ['Database', 'PostgreSQL + pgvector, Prisma 7', 'Files, symbols, graphs, code chunks, vectors'],
            ['Queue', 'Redis + QueuedJob table', 'Background repo-sync jobs'],
            ['Parsing', 'tree-sitter (JS/TS)', 'AST symbols, imports, exports'],
            ['Search', 'tsvector + pgvector', 'Lexical + semantic hybrid search'],
            ['Graph viz', 'Mermaid, dagre, elkjs, react-force-graph-2d', 'Architecture views'],
            ['AI', 'Groq / Gemini / Ollama (pluggable)', 'Ask + optional embeddings'],
            ['Agents', 'MCP SDK (stdio)', 'Cursor / Claude Desktop integration']
          ]}
        />
      </DocsSection>

      <DocsSection title="Indexing pipeline">
        <h3>1. Repository sync</h3>
        <p>
          Walks source files, parses with Tree-sitter, and persists <code>File</code>, <code>Symbol</code>,{' '}
          <code>FileImport</code>, and <code>FileExport</code> rows per revision. Concurrency is controlled by{' '}
          <code>SYNC_CONCURRENCY</code>.
        </p>

        <h3>2. Dependency graph</h3>
        <p>
          Resolves import paths to module edges and symbol cross-references. Stores{' '}
          <code>ModuleDependency</code> and <code>SymbolDependency</code>. Powers Architecture, Impact, and graph
          boosts in search ranking.
        </p>

        <h3>3. Search index</h3>
        <p>
          Splits file content into overlapping line chunks (~40 lines, 8-line overlap). Embeddings are stored as
          pgvector columns; <code>searchVector</code> is a generated tsvector for full-text search. Inserts use
          batched raw SQL inside a Prisma interactive transaction (vector type is Unsupported in Prisma schema).
        </p>

        <h3>4. History ingest</h3>
        <p>
          Reads recent commits (capped by <code>HISTORY_MAX_COMMITS</code>) to populate{' '}
          <code>CommitRecord</code>, <code>CoChangePair</code>, and <code>ModuleHotspot</code>.
        </p>
      </DocsSection>

      <DocsSection title="Design decisions">
        <ul>
          <li>
            <strong>Deterministic graphs over LLM sketches</strong> — dependency edges come from parsed imports,
            not generated diagrams. Safer for refactors and impact analysis.
          </li>
          <li>
            <strong>Revision-scoped data</strong> — every indexed artifact ties to a <code>RepositoryRevision</code>{' '}
            SHA so views can pin to a commit.
          </li>
          <li>
            <strong>BFF auth in Next.js</strong> — GitHub OAuth and session cookies live in the web app; API calls
            use <code>INTERNAL_API_SECRET</code> from server routes.
          </li>
          <li>
            <strong>Queue + inline indexing</strong> — production uses a worker; local dev sets{' '}
            <code>INDEX_INLINE=true</code> to skip Redis worker setup.
          </li>
          <li>
            <strong>Pluggable LLM/embeddings</strong> — Ask works with Groq/Gemini free tiers; search falls back to
            local-hash embeddings when no API key is set.
          </li>
          <li>
            <strong>Monorepo with Turbo</strong> — shared GitHub helpers in <code>common</code>; single{' '}
            <code>yarn dev</code> for parallel API + web.
          </li>
        </ul>
      </DocsSection>

      <DocsSection title="Repository identity">
        <p>
          Public repositories get a stable UUID derived from the GitHub <code>owner/repo</code> slug via{' '}
          <code>deriveRepositoryId</code> in <code>@repopilot/common</code>. Dashboard URLs use this ID:
        </p>
        <DocsCode>{`/dashboard/e66b9dbb-8c37-4622-87c5-4fbf0132fe6c`}</DocsCode>
      </DocsSection>
    </DocsLayout>
  );
}
