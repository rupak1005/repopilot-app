#!/usr/bin/env bash
# Pre-index curated landing examples so guests open them instantly after deploy.
# Matches web/lib/exampleRepos.ts picks (subset). Requires api/.env DATABASE_URL.
#
# Usage:
#   ./scripts/preindex-examples.sh
#   DATABASE_URL=postgresql://...neon... ./scripts/preindex-examples.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PREINDEX_SLUGS=(
  "fastapi/fastapi"
  "streamlit/streamlit"
  "rupak1005/repopilot"
)

log() { echo "[preindex] $*"; }

log "Building packages…"
yarn --cwd common build
yarn --cwd api build

set -a
# ponytail: CLI defaults to localhost Postgres without api/.env
source "$ROOT/api/.env"
set +a

for slug in "${PREINDEX_SLUGS[@]}"; do
  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/repopilot-preindex.XXXXXX")"
  log "Cloning $slug…"
  git clone --depth 1 "https://github.com/${slug}.git" "$tmpdir"
  log "Indexing $slug…"
  "$ROOT/scripts/index-repo.sh" "$slug" "$tmpdir"
  rm -rf "$tmpdir"
  log "Done: $slug"
done

log "All example repos indexed. Open from landing chips or /dashboard/<repo-id>."
