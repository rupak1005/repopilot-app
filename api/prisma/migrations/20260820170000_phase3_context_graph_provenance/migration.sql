-- Phase 3 Context Graph: edge kind + provenance on dependency tables

ALTER TABLE "SymbolDependency"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'calls',
  ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS "sourceFile" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceLine" INTEGER,
  ADD COLUMN IF NOT EXISTS "detector" TEXT NOT NULL DEFAULT 'heuristic';

CREATE INDEX IF NOT EXISTS "SymbolDependency_revisionId_kind_idx"
  ON "SymbolDependency"("revisionId", "kind");

ALTER TABLE "ModuleDependency"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'imports',
  ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "sourceFile" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceLine" INTEGER,
  ADD COLUMN IF NOT EXISTS "detector" TEXT NOT NULL DEFAULT 'tree-sitter';

CREATE INDEX IF NOT EXISTS "ModuleDependency_revisionId_kind_idx"
  ON "ModuleDependency"("revisionId", "kind");
