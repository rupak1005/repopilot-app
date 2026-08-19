#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export TMPDIR="${TMPDIR:-$ROOT/.tmp}"
mkdir -p "$TMPDIR" "$ROOT/.tmp"

if df /tmp 2>/dev/null | tail -1 | grep -q '100%'; then
  log "WARNING: /tmp is full. Using TMPDIR=$TMPDIR. Clear /tmp if commands fail: rm -rf /tmp/* (or reboot)."
fi

REPO_ID="${REPO_ID:-11111111-1111-1111-1111-111111111111}"
API_URL="${API_URL:-http://localhost:3001}"
REPO_PATH="${REPO_PATH:-$ROOT}"

log() { echo "[setup] $*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd node
require_cmd yarn
require_cmd git

# --- Infrastructure: prefer Docker, fall back to native Postgres + Redis ---
if command -v docker >/dev/null 2>&1; then
  log "Starting Postgres + Redis via Docker Compose..."
  docker compose up -d db redis
  for i in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U rp -d repopilot >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
else
  log "Docker not found — using native services."
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start postgresql 2>/dev/null || systemctl start postgresql 2>/dev/null || true
    if command -v redis-server >/dev/null 2>&1; then
      sudo systemctl start redis 2>/dev/null || systemctl start redis 2>/dev/null || true
    fi
  fi
  if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "Postgres is not running. Start it with: sudo systemctl start postgresql" >&2
    echo "Then create DB/user if needed (see scripts/setup-and-test.sh comments)." >&2
    exit 1
  fi
  if ! command -v redis-cli >/dev/null 2>&1; then
    echo "Redis CLI not found. Install: sudo pacman -S redis" >&2
    exit 1
  fi
  if ! redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
    echo "Redis is not running. Start with: sudo systemctl start redis" >&2
    exit 1
  fi
fi

# Ensure api/.env exists
if [[ ! -f api/.env ]]; then
  cat > api/.env <<'EOF'
DATABASE_URL=postgresql://rp:secret@localhost:5432/repopilot?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
REPO_CLONE_ROOT=/tmp/repopilot-repos
EOF
fi

if [[ ! -f web/.env.local ]]; then
  echo 'NEXT_PUBLIC_API_URL=http://localhost:3001' > web/.env.local
fi

log "Installing dependencies..."
yarn install

log "Generating Prisma client + applying migrations..."
yarn --cwd api prisma generate
yarn --cwd api prisma migrate deploy

log "Building API..."
yarn --cwd api build

log "Starting API and worker in background..."
mkdir -p "$ROOT/.tmp/logs"
(
  cd "$ROOT/api"
  set -a && source .env && set +a
  node dist/server.js
) >"$ROOT/.tmp/logs/api.log" 2>&1 &
API_PID=$!
echo "$API_PID" >"$ROOT/.tmp/api.pid"

(
  cd "$ROOT/api"
  set -a && source .env && set +a
  node dist/worker.js
) >"$ROOT/.tmp/logs/worker.log" 2>&1 &
WORKER_PID=$!
echo "$WORKER_PID" >"$ROOT/.tmp/worker.pid"

cleanup() {
  kill "$API_PID" "$WORKER_PID" 2>/dev/null || true
}
trap cleanup EXIT

log "Waiting for API health..."
for i in $(seq 1 30); do
  if curl -sf "$API_URL/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -sf "$API_URL/health" | tee "$ROOT/.tmp/health.json"
echo

log "Indexing repository $REPO_ID at $REPO_PATH ..."
SHA="$(git -C "$REPO_PATH" rev-parse HEAD)"

node api/dist/cli.js sync-repo \
  --repo-id "$REPO_ID" \
  --path "$REPO_PATH" \
  --owner deadlyr \
  --repo-name repoPilot \
  --revision-sha "$SHA"

node api/dist/cli.js build-graph --repo-id "$REPO_ID" --revision-sha "$SHA"
node api/dist/cli.js index-search --repo-id "$REPO_ID" --revision-sha "$SHA"
node api/dist/cli.js ingest-history --repo-id "$REPO_ID" --path "$REPO_PATH"

log "API smoke tests..."
curl -sf "$API_URL/api/v1/repositories/$REPO_ID/revisions" | head -c 500
echo
curl -sf -X POST "$API_URL/api/v1/repositories/$REPO_ID/search" \
  -H 'Content-Type: application/json' \
  -d '{"query":"repository sync","topK":3}' | head -c 500
echo
curl -sf "$API_URL/api/v1/repositories/$REPO_ID/hotspots?topK=3" | head -c 500
echo
curl -sf -X POST "$API_URL/api/v1/repositories/$REPO_ID/ask" \
  -H 'Content-Type: application/json' \
  -d '{"query":"What does syncRepository do?","revisionSha":"'"$SHA"'"}' | head -c 500
echo

log "Done. API PID=$API_PID worker PID=$WORKER_PID"
log "Logs: .tmp/logs/api.log .tmp/logs/worker.log"
log "Web UI: yarn --cwd web dev  →  http://localhost:3000 (paste repo id: $REPO_ID)"
log "Stop background services: kill \$(cat .tmp/api.pid) \$(cat .tmp/worker.pid)"
