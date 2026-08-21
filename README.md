# RepoPilot

**Engineering intelligence for GitHub repositories** — real dependency graphs, impact analysis, grounded Q&A, and agent tooling. Built from AST and git history, not LLM-invented diagrams.

| | |
|---|---|
| **App** | [repopilot.software](https://repopilot.software) |
| **Marketing** | [repopilot-pi.vercel.app](https://repopilot-pi.vercel.app/) (separate repo) |
| **Stack** | Next.js · Fastify · Postgres/pgvector · Redis · Tree-sitter · MCP |

---

## Why RepoPilot

Most “architecture” tools ask a model to *guess* your system. RepoPilot:

1. **Clones** a GitHub repo  
2. **Parses** TypeScript, JavaScript, Python, and Go with Tree-sitter  
3. **Persists** modules, symbols, and import edges per revision  
4. **Indexes** hybrid lexical + vector search  
5. **Answers** with citations to real files and lines  
6. **Exposes** the same graph to IDE agents over MCP  

**North star:** know what the system is, what depends on what, what churns, and whether a change is risky — with evidence you can open in the editor.

---

## Features

| Capability | What you get |
|------------|----------------|
| **Architecture** | Interactive 2D (and opt-in 3D) maps from real import edges |
| **Impact** | Blast radius for a file or change before you merge |
| **Hotspots** | Churn-ranked modules from git history |
| **Search** | Hybrid semantic + lexical hits with path and line |
| **Ask** | Grounded Q&A — answers cite retrieved snippets |
| **PR review** | Evidence-backed findings on pull requests |
| **MCP** | Tools for Cursor / Claude: search, impact, ask, context pack |
| **Guest mode** | Paste a public `owner/repo` and explore without signing in |

---

## Repository layout

Yarn workspaces + Turbo monorepo:

```text
repopilot/
├── web/          Next.js dashboard + BFF (OAuth, session cookies)
├── api/          Fastify REST API, indexer, worker, MCP server
├── common/       Shared types and GitHub helpers
├── docs/         PRD, HLD, LLD, setup, deploy
├── e2e/          Playwright smoke tests
└── scripts/      Index helpers and local setup
```

```text
Browser ──► web (:3000) ──► api (:3001) ──► Postgres + Redis
                              │
                              └── worker (optional; or INDEX_INLINE)
```

---

## Quick start

### Prerequisites

- Node.js **20+** and Yarn **1.22**
- PostgreSQL **15** with **pgvector**
- Redis **7**
- Git

```bash
docker compose up -d db redis
```

### Configure

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

Minimum local values:

| File | Required |
|------|----------|
| `api/.env` | `DATABASE_URL`, Redis URL/host, `PORT=3001`, `INDEX_INLINE=true` |
| `web/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:3001`, `SESSION_SECRET` |

Recommended free AI path (Ask / review):

```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_CHAT_MODEL=openai/gpt-oss-120b
EMBEDDING_PROVIDER=local
```

See [docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md) for alternatives.

### Run

```bash
yarn install
yarn --cwd api prisma generate
yarn --cwd api prisma migrate deploy

yarn --cwd api dev    # http://localhost:3001
yarn --cwd web dev    # http://localhost:3000
```

Optional background worker (when `INDEX_INLINE` is false):

```bash
yarn --cwd api worker
```

**Demo UI without indexing:** set `NEXT_PUBLIC_DEMO_MODE=true` in `web/.env.local` and restart the web app.

---

## Development

```bash
yarn lint
yarn type-check
yarn test                 # unit (workspaces)
yarn test:coverage
yarn test:e2e             # Playwright (demo routes)
yarn ci                   # full gate: lint → types → build → coverage → e2e
yarn build
```

Index a repo from the CLI (uses `api/.env`):

```bash
./scripts/index-repo.sh owner/repo
```

---

## Access modes

| Mode | Who | How |
|------|-----|-----|
| **Public guest** | Anyone | Paste a public GitHub URL → cookie session → index + explore |
| **GitHub OAuth** | Developers | Sign in → private and public repos |
| **Demo** | Design / CI | Seeded fixtures, no live index |
| **MCP agent** | Cursor / Claude Desktop | Stdio MCP bound to an indexed repo |

---

## Production

| Piece | Typical host |
|-------|----------------|
| Web app | Vercel (`web/`) — production URL [repopilot.software](https://repopilot.software) |
| API + worker | Railway / Render (Dockerfile) |
| Database | Neon (Postgres + pgvector) |
| Cache / queues | Upstash Redis |
| Chat | Groq (or configured provider) |

Guides:

- [docs/FREE_DEPLOY.md](docs/FREE_DEPLOY.md) — free-tier path  
- [docs/PRODUCTION_DOMAIN.md](docs/PRODUCTION_DOMAIN.md) — custom domain + DNS  
- [docs/SETUP.md](docs/SETUP.md) — local detail, webhooks, troubleshooting  

---

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/PRD.md](docs/PRD.md) | Product requirements |
| [docs/HLD.md](docs/HLD.md) | System design |
| [docs/LLD.md](docs/LLD.md) | Modules, APIs, data model |
| [docs/SETUP.md](docs/SETUP.md) | Local development |
| [docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md) | LLM and embedding providers |
| [DESIGN.md](DESIGN.md) | Visual system |

In-app docs: `/docs` on the running web app.

---

## Security notes

- Session cookies are HMAC-signed (`SESSION_SECRET`)
- Optional `INTERNAL_API_SECRET` for BFF → API
- GitHub webhooks verified with `GITHUB_WEBHOOK_SECRET`
- Ask / review are grounded on retrieved context; they are advisory, not a CI gate

---

## Contributing

1. Fork and branch from `master`
2. Keep changes focused; prefer the smallest correct fix
3. Run `yarn ci` before opening a PR
4. Document non-obvious behavior in `docs/` when it affects operators

Issues and PRs: [github.com/rupak1005/repopilot-app](https://github.com/rupak1005/repopilot-app)

---

## Status

RepoPilot is an active product MVP: guest public indexing, signed-in GitHub flows, architecture / impact / Ask / MCP, and a free-tier deploy path. Marketing remains a separate site; this monorepo is the **application** and **API** only.

Built for engineers who want **traceable** system understanding — files, edges, and citations — not a pretty guess.
