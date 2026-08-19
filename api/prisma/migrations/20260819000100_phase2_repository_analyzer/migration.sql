-- Phase 2: Repository Analyzer tables (file/symbol/import/export)

CREATE TABLE "Repository" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "File" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "repositoryId" UUID NOT NULL,
  "path" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "File_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "File_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "File_repositoryId_path_key" ON "File"("repositoryId", "path");
CREATE INDEX "File_repositoryId_idx" ON "File"("repositoryId");

CREATE TABLE "Symbol" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fileId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "startLine" INTEGER NOT NULL,
  "endLine" INTEGER NOT NULL,
  CONSTRAINT "Symbol_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Symbol_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE
);

CREATE INDEX "Symbol_fileId_idx" ON "Symbol"("fileId");
CREATE INDEX "Symbol_name_idx" ON "Symbol"("name");

CREATE TABLE "FileImport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fileId" UUID NOT NULL,
  "module" TEXT NOT NULL,
  "specifiers" TEXT[] NOT NULL,
  CONSTRAINT "FileImport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FileImport_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE
);

CREATE INDEX "FileImport_fileId_idx" ON "FileImport"("fileId");
CREATE INDEX "FileImport_module_idx" ON "FileImport"("module");

CREATE TABLE "FileExport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fileId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "FileExport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FileExport_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE
);

CREATE INDEX "FileExport_fileId_idx" ON "FileExport"("fileId");
CREATE INDEX "FileExport_name_idx" ON "FileExport"("name");

