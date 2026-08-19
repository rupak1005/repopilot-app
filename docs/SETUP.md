# RepoPilot — local setup & test

## One-time prerequisites (Arch Linux)

Run these **once** in your terminal (requires sudo):

```bash
# Option A — Docker (recommended)
sudo pacman -S docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
# log out/in so docker group applies, then:
cd /home/deadlyr/repoPilot
docker compose up -d db redis

# Option B — Native Postgres + Redis (no Docker)
sudo pacman -S postgresql redis
sudo systemctl enable --now postgresql redis
sudo -u postgres psql -c "CREATE USER rp WITH PASSWORD 'secret' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE repopilot OWNER rp;"
# pgvector for search (optional but needed for semantic search):
sudo pacman -S postgresql-pgvector  # if available on your system
```

Env files (already created if you followed earlier steps):

- `api/.env` — DATABASE_URL, REDIS_HOST, REDIS_PORT, PORT, REPO_CLONE_ROOT
- `web/.env.local` — NEXT_PUBLIC_API_URL=http://localhost:3001

## Automated setup + smoke test

```bash
cd /home/deadlyr/repoPilot
chmod +x scripts/setup-and-test.sh
export TMPDIR="$PWD/.tmp"   # avoids /tmp ENOSPC on some systems
./scripts/setup-and-test.sh
```

This script:

1. Starts Docker `db` + `redis` (or checks native services)
2. Runs `yarn install`, Prisma migrate, API build
3. Starts API + worker in the background
4. Syncs this repo, builds graph, indexes search, ingests git history
5. Hits `/health`, search, hotspots, ask endpoints

Default test repository ID: `11111111-1111-1111-1111-111111111111`

## Manual dev (3 terminals)

```bash
# Terminal 1 — after db/redis are up
yarn --cwd api prisma generate
yarn --cwd api prisma migrate deploy
yarn --cwd api dev

# Terminal 2
yarn --cwd api dev:worker

# Terminal 3
yarn --cwd web dev
```

- API: http://localhost:3001/health  
- Web: http://localhost:3000 (paste repo UUID from setup script)

## Unit tests (no database required)

```bash
export TMPDIR="$PWD/.tmp"
yarn test
```

Integration tests need `TEST_DATABASE_URL` pointing at a migrated database.

## Stop background API/worker from setup script

```bash
kill "$(cat .tmp/api.pid)" "$(cat .tmp/worker.pid)" 2>/dev/null
```
