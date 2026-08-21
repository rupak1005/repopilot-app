-- Phase 1.3: target line provenance on dependency edges

ALTER TABLE "SymbolDependency"
  ADD COLUMN IF NOT EXISTS "targetLine" INTEGER;

ALTER TABLE "ModuleDependency"
  ADD COLUMN IF NOT EXISTS "targetLine" INTEGER;
