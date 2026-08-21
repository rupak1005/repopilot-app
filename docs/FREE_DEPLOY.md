# RepoPilot — free deploy guide ($0/month MVP)

Deploy RepoPilot using free tiers. **Marketing stays separate** at [repopilot-pi.vercel.app](https://repopilot-pi.vercel.app/) — this guide deploys the **app** and **API** only.

**Production app URL:** [https://repopilot.software](https://repopilot.software) — see [PRODUCTION_DOMAIN.md](./PRODUCTION_DOMAIN.md) for DNS and cutover.

**Total cost:** $0 while free credits/limits last (Railway ~$5/mo credit, then you pay or migrate).

---

## Architecture

```text
repopilot-pi.vercel.app     Marketing (already live — separate project)
your-app.vercel.app         App dashboard (this repo → web/)
your-api.up.railway.app     API + worker (this repo → api/)
Neon                        Postgres + pgvector (free)
Upstash                     Redis (free)
Groq                        Chat AI (free tier)
Local embeddings            Search (no API cost)
UptimeRobot                 Ping /health (free, optional)
```

---

## Prerequisites

- GitHub repo pushed (this monorepo)
- Accounts (all have free tiers):
  - [Neon](https://neon.tech)
  - [Upstash](https://upstash.com)
  - [Railway](https://railway.app)
  - [Vercel](https://vercel.com)
  - [Groq](https://console.groq.com) — you already have a key
  - [UptimeRobot](https://uptimerobot.com) — optional keep-alive

---

## Step 1 — Neon (Postgres + pgvector)

1. Create project → copy **connection string** (pooled URL recommended).
2. In Neon SQL console run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Save as `DATABASE_URL` for Railway later.

Example:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/repopilot?sslmode=require
```

---

## Step 2 — Upstash (Redis)

1. Create Redis database (regional, free tier).
2. Copy **Redis URL** (`rediss://...`) from Upstash dashboard.

Use either:

```env
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379
```

Or separate vars:

```env
REDIS_HOST=YOUR_HOST.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_PASSWORD
REDIS_TLS=true
```

---

## Step 3 — Railway (API + worker)

Create one Railway project with **two services** from the same GitHub repo.

### 3a. API service

1. **New Project** → **Deploy from GitHub** → select `repoPilot`.
2. **Settings → Build:**
   - Builder: **Dockerfile**
   - Dockerfile path: `api/Dockerfile`
   - Root directory: `/` (repo root — Dockerfile expects monorepo layout)
3. **Settings → Deploy:**
   - **Serverless:** OFF for Alpha (no cold starts). Turn ON later to save credit + use UptimeRobot (Step 6).
   - Start command (default from Dockerfile is fine):

```bash
yarn --cwd api prisma generate && yarn --cwd api build && yarn --cwd api prisma migrate deploy && yarn --cwd api start
```

4. **Variables** (Settings → Variables):

```env
DATABASE_URL=postgresql://...neon...
REDIS_URL=rediss://...upstash...
PORT=3001
REPO_CLONE_ROOT=/data/repos

LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_CHAT_MODEL=openai/gpt-oss-120b
EMBEDDING_PROVIDER=local

GITHUB_TOKEN=github_pat_...
GITHUB_WEBHOOK_SECRET=your-secret

CORS_ORIGINS=https://repopilot.software,https://www.repopilot.software,http://localhost:3000
```

5. **Volume** (optional but recommended for git clones):
   - Settings → Volumes → mount `/data/repos` → set `REPO_CLONE_ROOT=/data/repos`

6. **Networking** → generate domain → e.g. `repopilot-api-production.up.railway.app`

7. Verify:

```bash
curl https://YOUR-API.up.railway.app/health
# {"status":"ok","postgres":true,"redis":true}
```

### 3b. Worker service

1. In same Railway project → **New Service** → same GitHub repo.
2. Same Dockerfile: `api/Dockerfile`
3. **Custom start command:**

```bash
yarn --cwd api prisma generate && yarn --cwd api build && yarn --cwd api worker
```

4. Copy **same env vars** as API (except `PORT` not needed).
5. Attach same **volume** at `/data/repos` if using repo clones.
6. Worker stays awake automatically (polls Postgres — outbound traffic).

---

## Step 4 — Vercel (app dashboard)

**Do not** deploy marketing here — that stays on `repopilot-pi.vercel.app`.

1. [vercel.com](https://vercel.com) → **Add New Project** → import GitHub repo.
2. **Root Directory:** `web`
3. Framework: Next.js (auto-detected)
4. **Environment variables:**

```env
NEXT_PUBLIC_API_URL=https://YOUR-API.up.railway.app
NEXT_PUBLIC_APP_URL=https://repopilot.software
NEXT_PUBLIC_MARKETING_URL=https://repopilot-pi.vercel.app
NEXT_PUBLIC_DEMO_MODE=false
SESSION_SECRET=<openssl rand -hex 32>
INTERNAL_API_SECRET=<same as Railway API>
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

5. Deploy → production alias is `https://repopilot.software` (custom domain; see [PRODUCTION_DOMAIN.md](./PRODUCTION_DOMAIN.md)). Legacy: `https://repopilot-app.vercel.app`.

6. Update Railway `CORS_ORIGINS` to include `https://repopilot.software` (and `https://www.repopilot.software` if needed) → redeploy API.

---

## Step 5 — Pre-index landing examples (recommended)

Warm up the three landing chips so guests open them instantly:

```bash
export DATABASE_URL="postgresql://...neon..."
./scripts/preindex-examples.sh
```

Indexes `fastapi/fastapi`, `streamlit/streamlit`, and `rupak1005/repopilot` (see `web/lib/exampleRepos.ts`).

---

## Step 5b — Index your own repo (optional)

From your laptop (or Railway one-off shell):

```bash
export DATABASE_URL="postgresql://...neon..."
export TMPDIR="$PWD/.tmp"

yarn --cwd api prisma migrate deploy
yarn --cwd api build

REPO_ID=11111111-1111-1111-1111-111111111111
SHA=$(git rev-parse HEAD)

node api/dist/cli.js sync-repo \
  --repo-id "$REPO_ID" \
  --path "$PWD" \
  --owner YOUR_GH_USER \
  --repo-name repoPilot \
  --revision-sha "$SHA"

node api/dist/cli.js build-graph --repo-id "$REPO_ID" --revision-sha "$SHA"
node api/dist/cli.js index-search --repo-id "$REPO_ID" --revision-sha "$SHA"
node api/dist/cli.js ingest-history --repo-id "$REPO_ID" --path "$PWD"
```

Open app → paste repo ID `11111111-1111-1111-1111-111111111111`.

---

## Step 6 — Keep API awake (optional)

Only needed if **Serverless is ON** on Railway.

1. [UptimeRobot](https://uptimerobot.com) → **Add Monitor**
2. Type: HTTP(s)
3. URL: `https://YOUR-API.up.railway.app/health`
4. Interval: **5 minutes**
5. Alert: email if down

Alternative: [cron-job.org](https://cron-job.org) every 8 min → same URL.

---

## Step 7 — GitHub webhook

1. GitHub repo → **Settings → Webhooks → Add webhook**
2. **Payload URL:** `https://YOUR-API.up.railway.app/webhook`
3. **Secret:** same as `GITHUB_WEBHOOK_SECRET` on Railway
4. **Events:** Push, Pull requests
5. Send test delivery → check Railway logs for `Webhook received`

---

## Step 8 — Marketing site CTA

In your **separate** marketing project (`repopilot-pi.vercel.app`), set “Get started” to:

```text
https://repopilot.software
```

Do not point marketing at the API URL.

---

## Free AI stack (recap)

| Feature | Provider | Cost |
|---------|----------|------|
| Chat / Q&A / PR review | Groq (`LLM_PROVIDER=groq`) | Free tier |
| Backup chat | Gemini (`LLM_PROVIDER=gemini`) | Free tier |
| Search embeddings | `EMBEDDING_PROVIDER=local` | $0 |

See [AI_PROVIDERS.md](./AI_PROVIDERS.md) for details.

---

## Env var checklist (Railway)

| Variable | Required | Source |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Neon |
| `REDIS_URL` or `REDIS_HOST`+`REDIS_TLS` | Yes | Upstash |
| `GROQ_API_KEY` | Yes (free AI) | Groq console |
| `LLM_PROVIDER` | Yes | `groq` |
| `EMBEDDING_PROVIDER` | Yes | `local` |
| `GITHUB_TOKEN` | For Checks | GitHub PAT |
| `GITHUB_WEBHOOK_SECRET` | For webhooks | You generate |
| `CORS_ORIGINS` | Yes | Vercel app URL |
| `REPO_CLONE_ROOT` | Worker clones | `/data/repos` + volume |

Never commit real values — use Railway/Vercel secret UI only.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `/health` → `redis: false` | Check `REDIS_URL` or `REDIS_TLS=true` + password |
| CORS error in browser | Add Vercel URL to `CORS_ORIGINS`, redeploy API |
| 502 on first request | Serverless cold start — disable Serverless or use UptimeRobot |
| Migrations fail | Run `prisma migrate deploy` in API start command |
| `vector` extension error | Run `CREATE EXTENSION vector` in Neon console |
| Groq rate limit | Switch to `LLM_PROVIDER=gemini` temporarily |
| Webhook 401 | Secret mismatch between GitHub and Railway |
| Railway credit gone | Migrate API to Fly.io or $4 VPS — keep Neon + Upstash |

---

## When free tier runs out

| Component | Free alternative |
|-----------|------------------|
| Railway API | Fly.io (~$3/mo) or Oracle Always Free VM |
| Neon | Stay on free until 0.5GB limit hit |
| Groq | Gemini free tier or Ollama local |
| Vercel | Usually stays free for hobby traffic |

---

## Related docs

- [AI_PROVIDERS.md](./AI_PROVIDERS.md) — Groq / Gemini / Ollama / OpenAI
- [SETUP.md](./SETUP.md) — local development and CI
- [api/.env.example](../api/.env.example) — all API env vars
- In-app docs: `/docs` on the web app

---

## Quick verify (production)

- [ ] `curl https://API/health` → ok + postgres + redis
- [ ] App loads on Vercel, no CORS errors
- [ ] Search + Ask work on an indexed repo
- [ ] Marketing links to app URL
- [ ] GitHub webhook deliveries → 200
- [ ] UptimeRobot green (if Serverless on)
