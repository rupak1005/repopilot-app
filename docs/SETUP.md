# RepoPilot — local setup

## Prerequisites

- Node.js 20+ and Yarn 1.22
- PostgreSQL 15 with **pgvector** (or Docker Compose)
- Redis 7
- Git

```bash
# Docker (recommended)
docker compose up -d db redis

# Or native Postgres + Redis — create DB/user, then:
# CREATE EXTENSION IF NOT EXISTS vector;
```

## Env files

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

Minimum local values:

| File | Keys |
|------|------|
| `api/.env` | `DATABASE_URL`, Redis (`REDIS_HOST`/`REDIS_PORT` or `REDIS_URL`), `PORT=3001`, `INDEX_INLINE=true` |
| `web/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:3001`, `SESSION_SECRET` (any long random string) |

For Ask / PR review, set a chat provider (see [AI_PROVIDERS.md](./AI_PROVIDERS.md)). Recommended free stack:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_CHAT_MODEL=openai/gpt-oss-120b
EMBEDDING_PROVIDER=local
```

## Run locally

```bash
yarn install
yarn --cwd api prisma generate
yarn --cwd api prisma migrate deploy

# Terminal 1 — API (inline indexing OK with INDEX_INLINE=true)
yarn --cwd api dev

# Terminal 2 — web
yarn --cwd web dev

# Optional — background worker if INDEX_INLINE is false
yarn --cwd api worker
```

- Web: http://localhost:3000  
- API health: http://localhost:3001/health  

**Demo UI without indexing:** set `NEXT_PUBLIC_DEMO_MODE=true` in `web/.env.local` and restart web.

## Automated smoke setup

```bash
chmod +x scripts/setup-and-test.sh
export TMPDIR="$PWD/.tmp"
./scripts/setup-and-test.sh
```

Starts DB/Redis, migrates, builds API, indexes this repo, and hits health/search/ask.

## Index a GitHub repo

```bash
./scripts/index-repo.sh owner/repo
# or warm landing chips:
./scripts/preindex-examples.sh
```

## Quality checks

```bash
yarn lint
yarn type-check
yarn build
yarn test                 # unit (api + web + common)
yarn test:coverage        # unit + coverage thresholds
yarn test:e2e             # Playwright (demo-mode UI routes; needs build first)
yarn ci                   # lint + type-check + build + coverage + e2e
```

E2E expects a production web build with demo mode:

```bash
SESSION_SECRET=e2e-test-session-secret-32chars-minimum \
NEXT_PUBLIC_DEMO_MODE=true \
yarn build

E2E_PORT=3099 yarn test:e2e
```

## Stop background API/worker from setup script

```bash
kill "$(cat .tmp/api.pid)" "$(cat .tmp/worker.pid)" 2>/dev/null
```
