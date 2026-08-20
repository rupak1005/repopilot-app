# RepoPilot — Low-Level Design (LLD)

**Version:** 3.0 · **Audience:** engineers changing `api/` / `web/` · **Date:** August 2026

---

## 1. Repository layout

```text
common/src/          github helpers + types
api/
  prisma/            schema + migrations
  prompts/           LLM prompt templates
  src/
    server.ts        Fastify bootstrap + routes
    worker.ts        job consumer
    cli.ts           sync/graph/search/history CLI
    mcp/server.ts    MCP stdio
    middleware/      internalAuth, rateLimit
    repo/            fileDiscovery, treeSitterParser, moduleResolve, persistence
    services/        index, sync, graph, search, ask, PR, history, MCP tools…
web/
  pages/             Next.js routes + BFF under pages/api
  lib/               session, demo, index status, architecture helpers
  components/        AppShell, UI, IndexProgressFloat
docs/                PRD / HLD / LLD / setup / deploy / AI
e2e/                 Playwright route coverage (demo mode)
```

---

## 2. HTTP API (`api/src/server.ts`)

Base: Fastify on `PORT` (default 3001). JSON bodies parsed as `{ rawBody, json }` for webhook HMAC.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Postgres + Redis ping |
| POST | `/webhook` | GitHub `x-hub-signature-256` |
| POST | `/api/v1/public/repositories/open` | Public index start; rate-limited |
| GET | `/api/v1/public/repositories/browse` | GitHub search proxy |
| POST | `/api/v1/repositories/:repoId/index` | Auth’d index (owner/name/token) |
| GET | `/api/v1/repositories/:repoId/index/status` | Job + counts + stage |
| GET | `/api/v1/repositories/:repoId/index/stream` | SSE status every ~1.5s |
| POST | `/api/v1/repositories/:repoId/graph/rebuild` | Rebuild edges only |
| GET | `/api/v1/repositories/:repoId/revisions` | List SHAs |
| POST | `/api/v1/repositories/:repoId/search` | Hybrid search |
| POST | `/api/v1/repositories/:repoId/ask` | Grounded Q&A |
| GET | `/api/v1/repositories/:repoId/pulls` | PR list |
| GET | `/api/v1/repositories/:repoId/pulls/:number` | PR detail |
| POST | `/api/v1/repositories/:repoId/pulls/:number/review` | Trigger review |
| GET | `/api/v1/repositories/:repoId/reviews/history` | Review history |
| GET | `/api/v1/repositories/:repoId/analytics` | Review KPIs |
| GET | `/api/v1/repositories/:repoId/dependencies` | Symbol or file traversal |
| GET | `/api/v1/repositories/:repoId/graph` | Context graph views |
| GET | `/api/v1/repositories/:repoId/architecture` | Architecture graph payload |
| GET | `/api/v1/repositories/:repoId/impact` | File impact |
| GET | `/api/v1/repositories/:repoId/hotspots` | Module hotspots |
| GET | `/api/v1/repositories/:repoId/co-change` | Co-change pairs |
| GET | `/api/v1/repositories/:repoId/similar-changes` | Similar PRs |
| GET | `/api/v1/repositories/:repoId/symbols/:name/history` | Symbol history |
| POST | `/api/v1/repositories/:repoId/history/ingest` | Manual history |
| POST | `/api/v1/repositories/:repoId/search/history` | History search |

When `INTERNAL_API_SECRET` is set, all `/api/v1/*` require header `x-repopilot-internal-key`.

### Web BFF

`web/pages/api/repositories/[repoId]/[...path].ts` proxies allowed prefixes (`ask`, `search`, `pulls`, …) after session repo check. Index status/stream have dedicated routes.

---

## 3. Prisma models (purpose)

| Model | Purpose |
|-------|---------|
| `User` | Stub only — unused by app auth |
| `Repository` | Indexed repo root (`owner`/`name`) |
| `RepositoryRevision` | Immutable SHA snapshot |
| `File` / `Symbol` / `FileImport` / `FileExport` | Parsed AST artifacts |
| `ModuleDependency` / `SymbolDependency` | Import / call edges |
| `CodeChunk` | Search unit; `embedding vector(1536)` + `tsvector` |
| `QueuedJob` | Durable jobs (`repo-sync`, reviews) |
| `WebhookDelivery` | Delivery idempotency |
| `PullRequest` (+ revision / review / finding / evidence) | PR intelligence |
| `CommitRecord` / `CommitFileChange` | Git history |
| `CoChangePair` / `ModuleHotspot` | Churn analytics |
| `HistoryIngestState` | Resume/cursor for history |

IDs: repository UUID often derived as SHA-256-based UUID from `owner/repo` (`deriveRepositoryId` in common).

---

## 4. Indexing modules

| Module | File | Responsibility |
|--------|------|----------------|
| Orchestrator | `services/repositoryIndex.ts` | Start public/auth index; job begin/finish; status/stage; full pipeline |
| Clone | `services/githubClone.ts` | Clone/update under `REPO_CLONE_ROOT` |
| Sync | `services/repositorySync.ts` | Discover → parse → persist → search index |
| Discover | `repo/fileDiscovery.ts` | `*.{ts,tsx,js,jsx,py,go}` |
| Parse | `repo/treeSitterParser.ts` | Symbols / imports / exports (TS/JS, Python, Go) |
| Resolve | `repo/moduleResolve.ts` | Relative JS, dotted Python, Go import paths |
| Persist | `repo/persistence.ts` | Bulk upsert into Prisma |
| Graph | `services/dependencyGraphBuilder.ts` | Module + symbol edges |
| Graph query | `services/dependencyGraphQueries.ts` | Traversals for impact/deps |
| Search | `services/searchIndex.ts` | Chunk + embed + hybrid query |
| Embeddings | `services/embeddingProvider.ts` | openai / ollama / local |
| History | `services/historyIngest.ts` | Commits → co-change → hotspots |
| Intelligence | `services/engineeringIntelligence.ts` | Architecture, hotspots, co-change APIs |
| Impact | `services/impactAnalysis.ts` | File blast radius |
| Context | `services/contextGraph.ts` | Neighbor / expand views |

**Pipeline function:** `runFullRepositoryIndex` = sync → `buildDependencyGraph` → optional `ingestRepositoryHistory`.

**Background public open:** `beginIndexJob` then `void runFullRepositoryIndexWithJob` so SSE reports `indexing` immediately.

**Env knobs:** `INDEX_INLINE`, `SYNC_CONCURRENCY`, `HISTORY_MAX_COMMITS`.

---

## 5. AI modules

| Module | File | Contract |
|--------|------|----------|
| LLM | `services/llmProvider.ts` | `createStructuredResponse({ messages, schema })` |
| Ask | `services/codebaseQa.ts` | Search → prompt `codebase-qna-v1.txt` → validate citations |
| PR review | `services/prReview.ts` | Diff + policy → `pr-review-v1.txt` → findings |
| Policy | `services/reviewPolicy.ts` | Review thresholds / rules |

Providers: `groq` (OpenAI-compatible JSON object), `gemini`, `ollama`, `openai` (json_schema), `local` stub.  
Default Groq model: `openai/gpt-oss-120b` (post–Aug 2026 deprecations).

---

## 6. Auth & session (`web/lib/session.ts`)

```text
Cookie rp_session = base64url(JSON).hmac_sha256(SESSION_SECRET)
```

Fields: `login`, `avatarUrl`, `accessToken?`, `selectedRepoId`, `selectedRepoFullName`, `isPublicGuest?`.

- OAuth: `pages/api/auth/github.ts` + callback  
- Guest: `createPublicGuestSession` on public open  
- Logout clears cookie  

---

## 7. Frontend index UX

| Piece | Role |
|-------|------|
| `lib/indexStatus.ts` | SSE/poll status; percent heuristic; `isRepoIndexInProgress` |
| `lib/indexProgressUi.tsx` | Global float job context |
| `IndexProgressFloat` | Top-right progress notification |
| `lib/indexHint.ts` | Hide “not indexed” copy while indexing |

Architecture page reloads graph when status transitions `indexing → ready`.

---

## 8. MCP tools (`services/mcpTools.ts`)

| Tool | Behavior |
|------|----------|
| `search_codebase` | Hybrid search |
| `find_impact` | File impact analysis |
| `trace_dependencies` | Module/symbol traversal |
| `search_history` | History search |
| `ask_repository` | Same as Ask pipeline |
| `get_context_pack` | Bundled context for agents |

Binding: `MCP_REPO_SLUG` or `MCP_REPOSITORY_ID`. Optional `MCP_API_KEY`.

---

## 9. CLI (`api/src/cli.ts`)

```bash
node api/dist/cli.js sync-repo --repo-id … --path … --owner … --repo-name … --revision-sha …
node api/dist/cli.js build-graph --repo-id … --revision-sha …
node api/dist/cli.js index-search --repo-id … --revision-sha …
node api/dist/cli.js ingest-history --repo-id … --path …
```

Wrappers: `scripts/index-repo.sh`, `scripts/preindex-examples.sh`.

---

## 10. Testing map

| Layer | How |
|-------|-----|
| Unit | Vitest projects `api` / `web` / `common` (`vitest.config.ts`) |
| Coverage | `yarn test:coverage` with per-directory thresholds |
| E2E | Playwright `e2e/*` against demo-mode production web build |
| CI | `.github/workflows/ci.yml` → quality → unit → e2e |

---

## 11. Extension points

1. **New language:** extend `fileDiscovery` + Tree-sitter grammar + persistence mappings  
2. **New LLM:** implement `LLMProvider` + branch in `createLLMProvider`  
3. **New dashboard page:** add `AppShell` nav + BFF prefix allowlist  
4. **New MCP tool:** register in `mcp/server.ts` calling an existing service  

---

## 12. Related docs

- [PRD.md](./PRD.md) · [HLD.md](./HLD.md) · [SETUP.md](./SETUP.md) · [AI_PROVIDERS.md](./AI_PROVIDERS.md)
