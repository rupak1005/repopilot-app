import Link from 'next/link';
import { DocsCode, DocsLayout, DocsSection, DocsTable } from '../../components/ui/DocsLayout';

export default function DocsApiReferencePage() {
  return (
    <DocsLayout
      slug="api-reference"
      title="API reference"
      lede="Fastify REST API served at NEXT_PUBLIC_API_URL (default http://localhost:3001). Most dashboard routes proxy through Next.js BFF handlers."
    >
      <DocsSection title="Base URL">
        <DocsCode>{`# Local
http://localhost:3001

# Health
GET /health`}</DocsCode>
      </DocsSection>

      <DocsSection title="Public endpoints">
        <DocsTable
          headers={['Method', 'Path', 'Description']}
          rows={[
            ['POST', '/api/v1/public/repositories/open', 'Register + start indexing a public GitHub repo'],
            ['GET', '/api/v1/public/repositories/browse', 'Search public repos for the Browse page']
          ]}
        />
      </DocsSection>

      <DocsSection title="Repository endpoints">
        <p>All paths below are prefixed with <code>/api/v1/repositories/:repoId</code>.</p>
        <DocsTable
          headers={['Method', 'Path suffix', 'Description']}
          rows={[
            ['GET', '/revisions', 'List indexed revisions'],
            ['GET', '/revisions/:sha', 'Revision status and counts'],
            ['GET', '/index/status', 'Current index job state'],
            ['GET', '/index/stream', 'SSE stream of index progress'],
            ['POST', '/index', 'Enqueue full re-index'],
            ['POST', '/graph/rebuild', 'Rebuild dependency graph'],
            ['POST', '/search', 'Hybrid code search ({ query, topK })'],
            ['POST', '/ask', 'Ask with citations ({ query, revisionSha })'],
            ['GET', '/graph', 'Context graph (+ op=shortestPath|neighborhood|cycles)'],
            ['GET', '/architecture', 'Architecture layout payload'],
            ['GET', '/dependencies', 'Symbol/module traversal queries'],
            ['GET', '/impact', 'Impact for filePath, symbolName, or pullNumber'],
            ['GET', '/hotspots', 'Hotspot rankings (?topK=&windowDays=7|30|90|365)'],
            ['GET', '/co-change', 'Files that change together'],
            ['POST', '/search/history', 'Search commit messages and PR titles'],
            ['GET', '/similar-changes', 'Find similar historical diffs (?pullNumber=)'],
            ['GET', '/findings', 'Latest-review findings across PRs (?limit=)'],
            ['GET', '/pulls', 'List pull requests'],
            ['GET', '/pulls/:number', 'PR details + review'],
            ['POST', '/pulls/:number/review', 'Trigger PR review'],
            ['GET', '/reviews/history', 'Past review runs'],
            ['GET', '/analytics', 'Repository analytics summary'],
            ['POST', '/history/ingest', 'Ingest git history'],
            ['GET', '/symbols/:name/history', 'Symbol change timeline']
          ]}
        />
      </DocsSection>

      <DocsSection title="Webhooks">
        <DocsCode>{`POST /webhook
# GitHub push/PR events (requires GITHUB_WEBHOOK_SECRET)`}</DocsCode>
      </DocsSection>

      <DocsSection title="Example: search">
        <DocsCode>{`curl -X POST http://localhost:3001/api/v1/repositories/$REPO_ID/search \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"authenticate user","topK":5}'`}</DocsCode>
      </DocsSection>

      <DocsSection title="Authentication">
        <p>
          Dashboard pages call Next.js API routes under <code>/pages/api/repositories/[repoId]/</code>, which attach
          the internal secret. Direct API access in production should go through the same BFF or supply{' '}
          <code>INTERNAL_API_SECRET</code> as configured in <code>api/.env</code>.
        </p>
        <p>
          See <Link href="/docs/development">Development</Link> for env setup.
        </p>
      </DocsSection>
    </DocsLayout>
  );
}
