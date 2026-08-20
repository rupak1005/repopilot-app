import { DocsCode, DocsLayout, DocsSection, DocsTable } from '../../components/ui/DocsLayout';

export default function DocsDevelopmentPage() {
  return (
    <DocsLayout
      slug="development"
      title="Development"
      lede="Run Postgres, Redis, the API, worker, and web app locally. Build with Turbo and Yarn workspaces."
    >
      <DocsSection title="Prerequisites">
        <ul>
          <li>Node.js 20+ and Yarn 1.22</li>
          <li>PostgreSQL 15 with pgvector (or Docker Compose)</li>
          <li>Redis 7</li>
          <li>Git</li>
        </ul>
      </DocsSection>

      <DocsSection title="Quick setup">
        <p>The setup script installs deps, migrates the DB, starts API + worker, and smoke-tests endpoints:</p>
        <DocsCode>{`yarn setup:test

# Or step by step:
docker compose up -d db redis
cp api/.env.example api/.env
cp web/.env.example web/.env.local
yarn install
yarn --cwd api prisma generate
yarn --cwd api prisma migrate deploy
yarn dev`}</DocsCode>
        <p>
          <code>yarn dev</code> runs API (3001) and web (3000) in parallel via Turbo. Start the worker separately
          for queued indexing:
        </p>
        <DocsCode>{`yarn --cwd api worker`}</DocsCode>
      </DocsSection>

      <DocsSection title="Docker Compose">
        <p>Full stack including API, web, worker, Postgres (pgvector), and Redis:</p>
        <DocsCode>{`docker compose up --build

# Services:
#   web  → http://localhost:3000
#   api  → http://localhost:3001
#   db   → localhost:5432
#   redis → localhost:6379`}</DocsCode>
      </DocsSection>

      <DocsSection title="Build commands">
        <DocsTable
          headers={['Command', 'Description']}
          rows={[
            ['yarn build', 'Build all workspaces (Turbo)'],
            ['yarn --cwd api build', 'Compile API TypeScript'],
            ['yarn --cwd web build', 'Next.js production build'],
            ['yarn lint', 'ESLint all packages'],
            ['yarn type-check', 'TypeScript check all packages'],
            ['yarn test', 'Unit tests (api + web + common)'],
            ['yarn test:coverage', 'Unit tests with coverage thresholds'],
            ['yarn test:e2e', 'Playwright UI route coverage (demo mode)'],
            ['yarn ci', 'lint + type-check + build + coverage + e2e']
          ]}
        />
        <p>
          Full local setup notes: see <code>docs/SETUP.md</code> in the repo. Deploy guide:{' '}
          <code>docs/FREE_DEPLOY.md</code>. AI keys: <code>docs/AI_PROVIDERS.md</code>.
        </p>
      </DocsSection>

      <DocsSection title="Environment variables">
        <h3>API (<code>api/.env</code>)</h3>
        <DocsTable
          headers={['Variable', 'Purpose']}
          rows={[
            ['DATABASE_URL', 'PostgreSQL connection string'],
            ['REDIS_HOST / REDIS_PORT', 'Job queue (or REDIS_URL for Upstash)'],
            ['PORT', 'API listen port (default 3001)'],
            ['CORS_ORIGINS', 'Allowed web app origins'],
            ['LLM_PROVIDER + API keys', 'Groq, Gemini, OpenAI, or Ollama for Ask'],
            ['EMBEDDING_PROVIDER', 'openai | ollama | local (default local-hash)'],
            ['GITHUB_TOKEN', 'Higher rate limits for public repo metadata'],
            ['INDEX_INLINE', 'Run index jobs in API process (local dev)'],
            ['SYNC_CONCURRENCY', 'Parallel file parse workers'],
            ['HISTORY_MAX_COMMITS', 'Cap git history ingest (default 300)'],
            ['PRISMA_TX_TIMEOUT_MS', 'Interactive transaction timeout for bulk inserts']
          ]}
        />

        <h3>Web (<code>web/.env.local</code>)</h3>
        <DocsTable
          headers={['Variable', 'Purpose']}
          rows={[
            ['NEXT_PUBLIC_API_URL', 'Fastify API base URL'],
            ['NEXT_PUBLIC_APP_URL', 'Public app origin (canonical URLs, OAuth callback)'],
            ['NEXT_PUBLIC_MARKETING_URL', 'Separate marketing site URL'],
            ['NEXT_PUBLIC_DEMO_MODE', 'Show seeded dashboard without indexing'],
            ['GITHUB_CLIENT_ID / SECRET', 'OAuth for private repos'],
            ['SESSION_SECRET', 'Cookie signing key'],
            ['INTERNAL_API_SECRET', 'Shared secret with API BFF routes']
          ]}
        />
      </DocsSection>

      <DocsSection title="Indexing scripts">
        <DocsCode>{`# Index a repo by GitHub slug (uses api/.env)
./scripts/index-repo.sh owner/repo [local-path]

# Pre-index example repos for browse page
./scripts/preindex-examples.sh`}</DocsCode>
      </DocsSection>

      <DocsSection title="Health check">
        <DocsCode>{`curl http://localhost:3001/health`}</DocsCode>
      </DocsSection>
    </DocsLayout>
  );
}
