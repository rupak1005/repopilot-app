-- Phase 5: search and retrieval

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "CodeChunk" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "repositoryId" UUID NOT NULL,
  "revisionId" UUID NOT NULL,
  "fileId" UUID NOT NULL,
  "filePath" TEXT NOT NULL,
  "startLine" INTEGER NOT NULL,
  "endLine" INTEGER NOT NULL,
  "chunkType" TEXT NOT NULL DEFAULT 'lines',
  "text" TEXT NOT NULL,
  "embedding" vector(1536),
  "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED,
  CONSTRAINT "CodeChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CodeChunk_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE,
  CONSTRAINT "CodeChunk_revisionId_fkey"
    FOREIGN KEY ("revisionId") REFERENCES "RepositoryRevision"("id") ON DELETE CASCADE,
  CONSTRAINT "CodeChunk_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "CodeChunk_revisionId_filePath_startLine_endLine_key"
  ON "CodeChunk"("revisionId", "filePath", "startLine", "endLine");
CREATE INDEX "CodeChunk_repositoryId_idx" ON "CodeChunk"("repositoryId");
CREATE INDEX "CodeChunk_revisionId_idx" ON "CodeChunk"("revisionId");
CREATE INDEX "CodeChunk_fileId_idx" ON "CodeChunk"("fileId");
CREATE INDEX "CodeChunk_searchVector_idx"
  ON "CodeChunk" USING GIN ("searchVector");
CREATE INDEX "CodeChunk_embedding_hnsw_idx"
  ON "CodeChunk" USING HNSW ("embedding" vector_cosine_ops);
