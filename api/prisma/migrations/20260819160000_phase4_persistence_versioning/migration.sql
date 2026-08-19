-- Phase 4: repository revisions + immutable analysis rows

CREATE TABLE "RepositoryRevision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "repositoryId" UUID NOT NULL,
  "revisionSha" TEXT NOT NULL,
  "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepositoryRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepositoryRevision_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "RepositoryRevision_repositoryId_revisionSha_key"
  ON "RepositoryRevision"("repositoryId", "revisionSha");
CREATE INDEX "RepositoryRevision_repositoryId_idx"
  ON "RepositoryRevision"("repositoryId");

ALTER TABLE "File"
  ADD COLUMN "revisionId" UUID;

ALTER TABLE "SymbolDependency"
  ADD COLUMN "revisionId" UUID;

ALTER TABLE "ModuleDependency"
  ADD COLUMN "revisionId" UUID;

WITH inserted_revisions AS (
  INSERT INTO "RepositoryRevision" ("repositoryId", "revisionSha", "indexedAt")
  SELECT r."id", 'legacy-current', CURRENT_TIMESTAMP
  FROM "Repository" r
  ON CONFLICT ("repositoryId", "revisionSha") DO NOTHING
  RETURNING "id", "repositoryId"
)
UPDATE "File" f
SET "revisionId" = rr."id"
FROM "RepositoryRevision" rr
WHERE rr."repositoryId" = f."repositoryId"
  AND rr."revisionSha" = 'legacy-current'
  AND f."revisionId" IS NULL;

UPDATE "SymbolDependency" sd
SET "revisionId" = f."revisionId"
FROM "Symbol" s
JOIN "File" f ON f."id" = s."fileId"
WHERE sd."fromSymbolId" = s."id"
  AND sd."revisionId" IS NULL;

UPDATE "ModuleDependency" md
SET "revisionId" = rr."id"
FROM "RepositoryRevision" rr
WHERE rr."repositoryId" = md."repositoryId"
  AND rr."revisionSha" = 'legacy-current'
  AND md."revisionId" IS NULL;

ALTER TABLE "File"
  ALTER COLUMN "revisionId" SET NOT NULL;
ALTER TABLE "SymbolDependency"
  ALTER COLUMN "revisionId" SET NOT NULL;
ALTER TABLE "ModuleDependency"
  ALTER COLUMN "revisionId" SET NOT NULL;

ALTER TABLE "File"
  ADD CONSTRAINT "File_revisionId_fkey"
    FOREIGN KEY ("revisionId") REFERENCES "RepositoryRevision"("id") ON DELETE CASCADE;
ALTER TABLE "SymbolDependency"
  ADD CONSTRAINT "SymbolDependency_revisionId_fkey"
    FOREIGN KEY ("revisionId") REFERENCES "RepositoryRevision"("id") ON DELETE CASCADE;
ALTER TABLE "ModuleDependency"
  ADD CONSTRAINT "ModuleDependency_revisionId_fkey"
    FOREIGN KEY ("revisionId") REFERENCES "RepositoryRevision"("id") ON DELETE CASCADE;

DROP INDEX "File_repositoryId_path_key";
CREATE UNIQUE INDEX "File_revisionId_path_key"
  ON "File"("revisionId", "path");
CREATE INDEX "File_revisionId_idx"
  ON "File"("revisionId");

DROP INDEX "SymbolDependency_fromSymbolId_toSymbolId_key";
DROP INDEX "SymbolDependency_fromSymbolId_idx";
DROP INDEX "SymbolDependency_toSymbolId_idx";
CREATE UNIQUE INDEX "SymbolDependency_revisionId_fromSymbolId_toSymbolId_key"
  ON "SymbolDependency"("revisionId", "fromSymbolId", "toSymbolId");
CREATE INDEX "SymbolDependency_revisionId_idx"
  ON "SymbolDependency"("revisionId");
CREATE INDEX "SymbolDependency_revisionId_fromSymbolId_idx"
  ON "SymbolDependency"("revisionId", "fromSymbolId");
CREATE INDEX "SymbolDependency_revisionId_toSymbolId_idx"
  ON "SymbolDependency"("revisionId", "toSymbolId");

DROP INDEX "ModuleDependency_repositoryId_fromModule_toModule_key";
CREATE UNIQUE INDEX "ModuleDependency_revisionId_fromModule_toModule_key"
  ON "ModuleDependency"("revisionId", "fromModule", "toModule");
CREATE INDEX "ModuleDependency_revisionId_idx"
  ON "ModuleDependency"("revisionId");
