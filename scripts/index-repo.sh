#!/usr/bin/env bash
# Index a GitHub repo for the RepoPilot dashboard (sync + graph + history + search).
# Usage: ./scripts/index-repo.sh owner/repo [path-to-clone-or-local-repo]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SLUG="${1:?Usage: $0 owner/repo [repo-path]}"
REPO_PATH="${2:-$ROOT}"
OWNER="${SLUG%%/*}"
NAME="${SLUG#*/}"

if [[ "$OWNER" == "$SLUG" || -z "$NAME" ]]; then
  echo "Expected slug like owner/repo, got: $SLUG" >&2
  exit 1
fi

log() { echo "[index] $*"; }

log "Building packages…"
yarn --cwd common build
yarn --cwd api build

set -a
# ponytail: CLI defaults to localhost Postgres without api/.env
source "$ROOT/api/.env"
set +a

REPO_ID="$(node -e "
  const { deriveRepositoryId } = require('./common/dist/github.js');
  console.log(deriveRepositoryId('$SLUG'));
")"

log "Repository ID for $SLUG → $REPO_ID"
log "Path: $REPO_PATH"

SHA="$(git -C "$REPO_PATH" rev-parse HEAD 2>/dev/null || echo main)"
CLI="node $ROOT/api/dist/cli.js"

$CLI sync-repo \
  --repo-id "$REPO_ID" \
  --path "$REPO_PATH" \
  --owner "$OWNER" \
  --repo-name "$NAME" \
  --revision-sha "$SHA"

$CLI build-graph --repo-id "$REPO_ID" --revision-sha "$SHA"
$CLI index-search --repo-id "$REPO_ID" --revision-sha "$SHA"
$CLI ingest-history --repo-id "$REPO_ID" --path "$REPO_PATH"

log "Done. Open dashboard at /dashboard/$REPO_ID"
log "Ensure GROQ_API_KEY or GEMINI_API_KEY is set in api/.env for Ask."
