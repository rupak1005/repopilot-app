# RepoPilot — High-Level Design (HLD)

**Version:** 3.0 · **Aligns with:** shipped monorepo (August 2026)

---

## 1. Goals

Provide a living, evidence-backed view of a repository:

- Structured code intelligence (AST + dependency graph + revisions)  
- Retrieval + grounded LLM reasoning  
- History-derived risk signals (hotspots, co-change)  
- Agent access via MCP  

---

## 2. System context

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Marketing site  │     │ Web (Next.js)    │     │ IDE agents      │
│ (separate)      │────▶│ Vercel           │     │ Cursor / Claude │
└─────────────────┘     │ BFF /api/*       │     └────────┬────────┘
                        └────────┬─────────┘              │ MCP stdio
                                 │ INTERNAL_API_SECRET    │
                                 ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ API (Fastify)    │◀────│ MCP server      │
                        │ Railway          │     │ api mcp         │
                        └────────┬─────────┘     └─────────────────┘
                   ┌─────────────┼─────────────┐
                   ▼             ▼             ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ Neon PG  │  │ Upstash  │  │ Groq /   │
            │ +pgvector│  │ Redis    │  │ Gemini…  │
            └──────────┘  └──────────┘  └──────────┘
                   ▲
                   │ worker (repo-sync, PR review jobs)
            ┌──────┴──────┐
            │ API worker  │
            │ Railway #2  │
            └─────────────┘
```

GitHub → webhook → API → queue → worker → DB → web/MCP consumers.

---

## 3. Package architecture

| Package | Responsibility |
|---------|----------------|
| `@repopilot/common` | `deriveRepositoryId`, `parseGithubRepoUrl`, shared types |
| `@repopilot/api` | HTTP API, indexing pipeline, worker, CLI, MCP |
| `@repopilot/web` | Pages UI, session/OAuth, BFF proxy to API |

**Process roles**

| Process | Entry | Role |
|---------|-------|------|
| API | `api/src/server.ts` | REST + webhook + health |
| Worker | `api/src/worker.ts` | Drain `QueuedJob` (sync / review) |
| Web | Next.js | UI + cookie session + BFF |
| MCP | `api/src/mcp/server.ts` | Stdio tools over same services |
| CLI | `api/src/cli.ts` | Manual sync/graph/search/history |

---

## 4. Core flows

### 4.1 Public open → index

1. User pastes URL → web `POST /api/public/open`  
2. API `POST /api/v1/public/repositories/open` validates public GitHub meta  
3. Create/ensure `Repository`, start background or inline full index  
4. Set guest session cookie with `repositoryId`  
5. Client shows floating index progress (SSE `/index/stream`)  

### 4.2 Full index pipeline

```text
clone/update on disk
    → sync (discover TS/JS → parse → persist → embed chunks)
    → build dependency graph
    → ingest git history (optional cap)
    → state: ready
```

Status derivation: job `QUEUED|RUNNING` → `indexing`; files present → `ready`; else `not_indexed` / `failed`.

### 4.3 Ask (grounded Q&A)

```text
query → hybrid search (top-K chunks)
      → optional 1-hop module dependents
      → LLM structured JSON (answer, confidence, citations)
      → validate citations ⊆ retrieved snippets
```

### 4.4 PR review

Webhook or UI trigger → load PR + diff context → LLM structured findings → persist `PullRequestReview` / `ReviewFinding` / evidence → optional GitHub Check.

### 4.5 MCP

Agent calls tools → same service layer as HTTP (search, impact, deps, history, ask, context pack) scoped to `MCP_REPO_SLUG` / `MCP_REPOSITORY_ID`.

---

## 5. Data design (logical)

**Versioned code intelligence**

- `Repository` → many `RepositoryRevision` (SHA)  
- Per revision: `File`, `Symbol`, imports/exports, `ModuleDependency`, `SymbolDependency`, `CodeChunk` (+ vector + tsvector)

**Jobs & webhooks**

- `WebhookDelivery` (idempotency)  
- `QueuedJob` (`repo-sync`, review jobs; status machine)

**PR intelligence**

- `PullRequest` → revisions → `PullRequestReview` → findings + evidence

**History intelligence**

- `CommitRecord` / `CommitFileChange` → `CoChangePair`, `ModuleHotspot`

---

## 6. Cross-cutting concerns

| Concern | Approach |
|---------|----------|
| AuthN | GitHub OAuth cookie **or** public guest cookie (HMAC `SESSION_SECRET`) |
| AuthZ | BFF asserts `session.selectedRepoId === :repoId` |
| Service auth | Optional `x-repopilot-internal-key` on `/api/v1/*` |
| Rate limit | In-memory public-open limiter (upgrade to Redis for multi-instance) |
| AI portability | Provider interfaces for LLM + embeddings; env-selected |
| Observability | Structured JSON logs; `/health` checks Postgres + Redis |
| CORS | `CORS_ORIGINS` for web app origin(s) |

---

## 7. Key design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Diagrams | Real import/AST edges | Differentiates from LLM Mermaid generators |
| Search | Hybrid lexical + vector | Works with free local embeddings; upgrades with OpenAI |
| Indexing | Sync → graph → history | Graph usable before full history finishes |
| Queue | Postgres `QueuedJob` + Redis | Durable jobs; Redis for worker coordination |
| Web stack | Next.js Pages + BFF | Cookie sessions stay server-side; API never sees OAuth cookies |
| Languages | TS/JS first | Tree-sitter grammars already in stack |
| Marketing | Separate deploy | Keep product app lean |

---

## 8. Deployment topology

See [FREE_DEPLOY.md](./FREE_DEPLOY.md): Vercel (`web/`) · Railway API + worker · Neon · Upstash · Groq.

Local: Docker Compose for Postgres/Redis or native services; `INDEX_INLINE=true` skips worker.

---

## 9. Related docs

- [PRD.md](./PRD.md) · [LLD.md](./LLD.md) · [AI_PROVIDERS.md](./AI_PROVIDERS.md)
