# Phase 2 — Repository Analyzer (Tree-sitter Parsing)

Phase 2 parses repository source files into syntactic structure (symbols, imports, exports) and persists the results into Postgres.

## What this phase produces

* New Prisma models/migrations under `api/prisma/`:
  * `repository`
  * `file`
  * `symbol`
  * `file_import`
  * `file_export`
* A sync pipeline:
  * File discovery (`api/src/repo/fileDiscovery.ts`)
  * Tree-sitter parsing + extraction (`api/src/repo/treeSitterParser.ts`)
  * DB persistence (`api/src/repo/persistence.ts`)
  * Orchestrator (`api/src/services/repositorySync.ts`)
  * CLI entrypoint (`api/src/cli.ts`)

## Prerequisites

1. Postgres is running and has the Phase 2 tables/migrations applied.
2. `DATABASE_URL` is set for the API process.

## Run a repository sync

From repo root:

```bash
node api/dist/cli.js sync-repo \
  --path /absolute/path/to/repo \
  --repo-id <repositoryId>
```

Optional flags:

```bash
node api/dist/cli.js sync-repo \
  --path /absolute/path/to/repo \
  --repo-id <repositoryId> \
  --repo-name "My Repo" \
  --owner "github-org" \
  --concurrency 8
```

Notes:
* Phase 2 currently expects TS/JS files (`.ts`, `.tsx`, `.js`, `.jsx`).
* `repository_id` is treated as the stable identity for all parsed data for this repo during Phase 2.

## Validate parsed results

Using `psql` (example assumes you know your `repository_id`):

```sql
-- Files ingested
SELECT id, path, indexedAt
FROM "File"
WHERE "repositoryId" = '<repositoryId>'
ORDER BY indexedAt DESC
LIMIT 20;

-- Symbols extracted
SELECT s.name, s.type, s.startLine, s.endLine
FROM "Symbol" s
JOIN "File" f ON f.id = s."fileId"
WHERE f."repositoryId" = '<repositoryId>'
ORDER BY s.startLine ASC
LIMIT 50;

-- Imports extracted
SELECT i.module, i."specifiers"
FROM "FileImport" i
JOIN "File" f ON f.id = i."fileId"
WHERE f."repositoryId" = '<repositoryId>'
LIMIT 50;
```

## Troubleshooting

* If a file fails to parse, Phase 2 logs `repo.sync.fileParseFailed` and continues.
* If your sync produces zero `symbol` rows, start by verifying Tree-sitter language selection (TS vs JS) matches your file extensions.

