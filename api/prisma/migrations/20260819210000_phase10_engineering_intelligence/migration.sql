CREATE TABLE IF NOT EXISTS "HistoryIngestState" (
  "repositoryId" UUID NOT NULL,
  "lastProcessedSha" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HistoryIngestState_pkey" PRIMARY KEY ("repositoryId"),
  CONSTRAINT "HistoryIngestState_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CommitRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "repositoryId" UUID NOT NULL,
  "sha" TEXT NOT NULL,
  "authorName" TEXT,
  "authorEmail" TEXT,
  "authoredAt" TIMESTAMP(3) NOT NULL,
  "message" TEXT NOT NULL,
  "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce("message", ''))) STORED,
  CONSTRAINT "CommitRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommitRecord_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommitRecord_repositoryId_sha_key"
  ON "CommitRecord"("repositoryId", "sha");
CREATE INDEX IF NOT EXISTS "CommitRecord_repositoryId_authoredAt_idx"
  ON "CommitRecord"("repositoryId", "authoredAt");
CREATE INDEX IF NOT EXISTS "CommitRecord_searchVector_idx"
  ON "CommitRecord" USING GIN ("searchVector");

CREATE TABLE IF NOT EXISTS "CommitFileChange" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "commitId" UUID NOT NULL,
  "filePath" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "additions" INTEGER NOT NULL DEFAULT 0,
  "deletions" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CommitFileChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommitFileChange_commitId_fkey"
    FOREIGN KEY ("commitId") REFERENCES "CommitRecord"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CommitFileChange_commitId_idx"
  ON "CommitFileChange"("commitId");
CREATE INDEX IF NOT EXISTS "CommitFileChange_filePath_idx"
  ON "CommitFileChange"("filePath");

CREATE TABLE IF NOT EXISTS "CoChangePair" (
  "repositoryId" UUID NOT NULL,
  "fileA" TEXT NOT NULL,
  "fileB" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CoChangePair_pkey" PRIMARY KEY ("repositoryId", "fileA", "fileB"),
  CONSTRAINT "CoChangePair_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CoChangePair_repositoryId_fileA_idx"
  ON "CoChangePair"("repositoryId", "fileA");

CREATE TABLE IF NOT EXISTS "ModuleHotspot" (
  "repositoryId" UUID NOT NULL,
  "filePath" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "changeCount" INTEGER NOT NULL DEFAULT 0,
  "dependentCount" INTEGER NOT NULL DEFAULT 0,
  "coChangeCount" INTEGER NOT NULL DEFAULT 0,
  "findingsCount" INTEGER NOT NULL DEFAULT 0,
  "reasons" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModuleHotspot_pkey" PRIMARY KEY ("repositoryId", "filePath"),
  CONSTRAINT "ModuleHotspot_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ModuleHotspot_repositoryId_score_idx"
  ON "ModuleHotspot"("repositoryId", "score" DESC);
