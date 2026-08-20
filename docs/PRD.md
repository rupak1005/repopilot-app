# RepoPilot — Product Requirements Document (PRD)

**Version:** 3.0 · **Status:** Current product (as shipped) · **Date:** August 2026

---

## 1. Product summary

RepoPilot is an **engineering intelligence workspace** for GitHub repositories. It clones and indexes a repo, builds a **real dependency graph** from Tree-sitter AST analysis (not LLM-generated diagrams), and exposes search, impact analysis, hotspots, grounded Q&A, PR review signals, and an MCP server for IDE agents.

**North star:** Understand what a system is, what depends on what, what churns, and whether a change is risky — with answers **traceable to files and lines**.

Marketing site stays separate ([repopilot-pi.vercel.app](https://repopilot-pi.vercel.app/)). This monorepo ships the **app** (`web/`) and **API** (`api/`).

---

## 2. Users & access modes

| Mode | Who | How |
|------|-----|-----|
| **Public guest** | Anyone | Paste public GitHub URL → cookie session (`isPublicGuest`) → index + explore |
| **GitHub signed-in** | Developers | OAuth → private + public repos via repo picker |
| **Demo** | Design / CI / e2e | `NEXT_PUBLIC_DEMO_MODE=true` → seeded fixtures, no API index |
| **MCP agent** | Cursor / Claude Desktop | Stdio MCP bound to one indexed repo |

---

## 3. Problem & differentiation

Typical “repo diagram” tools guess architecture with an LLM. RepoPilot:

1. **Parses** TypeScript/JavaScript with Tree-sitter  
2. **Persists** files, symbols, imports, module/symbol edges per revision SHA  
3. **Indexes** hybrid lexical + vector search  
4. **Answers** only from retrieved snippets (citations required)  
5. **Surfaces** history-derived hotspots and co-change  
6. **Exposes** the same intelligence to agents via MCP  

---

## 4. Functional requirements (shipped)

### 4.1 Public entry

- Paste `owner/repo` or GitHub URL on landing page → start public index  
- Short URL `/{owner}/{repo}`  
- Browse public GitHub repos (search / sort / stars)  
- In-app docs at `/docs`  

### 4.2 Indexing

- Clone public (or token-backed) repos  
- Progress stages: `clone → parse → graph → history → ready` (SSE + floating UI)  
- Inline indexing for local/dev (`INDEX_INLINE=true`) or queued worker  
- Cap history ingest via `HISTORY_MAX_COMMITS`  

### 4.3 Dashboard (per repository)

| Area | Requirement |
|------|-------------|
| Overview | KPIs, recent PRs, hotspot summary |
| Search | Hybrid semantic + lexical hits with file/line |
| Ask | Grounded Q&A with citations; structured LLM JSON |
| Pulls | List PRs; detail + review findings; trigger review |
| Hotspots | Ranked churn modules |
| Architecture | Interactive force/dagre graph from real edges |
| Impact | File-centric dependent modules / blast radius |
| Settings | Session/repo context |
| MCP | Connect instructions for Cursor / Claude |

### 4.4 Integrations

- GitHub webhook (`push`, `pull_request`) with signature verification  
- Optional Checks / review publishing when GitHub token configured  
- MCP tools: search, impact, dependencies, history, ask, context pack  

### 4.5 Quality / ops

- CI: lint, type-check, build, unit coverage, Playwright e2e (demo UI routes)  
- Free-tier deploy path: Vercel (web) + Railway (API/worker) + Neon + Upstash + Groq  

---

## 5. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Evidence | Ask/review answers must cite grounded snippets when possible |
| Security | Session HMAC cookies; optional `INTERNAL_API_SECRET` for BFF→API; webhook HMAC |
| Cost | Default AI path free (Groq chat + local embeddings) |
| Performance | Parallel sync (`SYNC_CONCURRENCY`); history capped for MVP |
| Language | AST parse for **TS/JS, Python, Go** (`*.{ts,tsx,js,jsx,py,go}`) |

---

## 6. Explicit non-goals (v3)

- Multi-tenant orgs, SSO, billing  
- First-class Java/C++/Rust AST (Python/Go graphs are in; others may clone without edges)  
- Merging marketing site into this monorepo  
- Slack/Teams bots beyond MCP  
- Guaranteeing CI gate enforcement (impact + review are advisory signals)

---

## 7. Success metrics (product)

- Guest can open a public repo and see architecture / search without signing in  
- Ask returns cited answer for indexed TS/JS/Python/Go repos with configured LLM  
- Indexing progress visible until `ready`  
- MCP tools return non-empty results for a pre-indexed `MCP_REPO_SLUG`  
- CI green on push (`yarn ci`)

---

## 8. Related docs

- [HLD.md](./HLD.md) — system design  
- [LLD.md](./LLD.md) — modules, APIs, data, pipelines  
- [SETUP.md](./SETUP.md) · [FREE_DEPLOY.md](./FREE_DEPLOY.md) · [AI_PROVIDERS.md](./AI_PROVIDERS.md)
