-- Phase 3: Dependency graph tables

CREATE TABLE "SymbolDependency" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fromSymbolId" UUID NOT NULL,
  "toSymbolId" UUID NOT NULL,
  CONSTRAINT "SymbolDependency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SymbolDependency_fromSymbolId_fkey" FOREIGN KEY ("fromSymbolId") REFERENCES "Symbol"("id") ON DELETE CASCADE,
  CONSTRAINT "SymbolDependency_toSymbolId_fkey" FOREIGN KEY ("toSymbolId") REFERENCES "Symbol"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "SymbolDependency_fromSymbolId_toSymbolId_key"
  ON "SymbolDependency"("fromSymbolId", "toSymbolId");
CREATE INDEX "SymbolDependency_fromSymbolId_idx" ON "SymbolDependency"("fromSymbolId");
CREATE INDEX "SymbolDependency_toSymbolId_idx" ON "SymbolDependency"("toSymbolId");

CREATE TABLE "ModuleDependency" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "repositoryId" UUID NOT NULL,
  "fromModule" TEXT NOT NULL,
  "toModule" TEXT NOT NULL,
  CONSTRAINT "ModuleDependency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ModuleDependency_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "ModuleDependency_repositoryId_fromModule_toModule_key"
  ON "ModuleDependency"("repositoryId", "fromModule", "toModule");
CREATE INDEX "ModuleDependency_repositoryId_idx" ON "ModuleDependency"("repositoryId");
CREATE INDEX "ModuleDependency_toModule_idx" ON "ModuleDependency"("toModule");
