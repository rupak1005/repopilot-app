CREATE TABLE IF NOT EXISTS "PullRequestReview" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pullRequestId" UUID NOT NULL,
  "headRevision" TEXT NOT NULL,
  "baseRevision" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "summary" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PullRequestReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PullRequestReview_pullRequestId_fkey"
    FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PullRequestReview_pullRequestId_headRevision_key"
  ON "PullRequestReview"("pullRequestId", "headRevision");

CREATE INDEX IF NOT EXISTS "PullRequestReview_pullRequestId_idx"
  ON "PullRequestReview"("pullRequestId");

CREATE TABLE IF NOT EXISTS "ReviewFinding" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reviewId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "confidence" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "suggestedAction" TEXT,
  CONSTRAINT "ReviewFinding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReviewFinding_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "PullRequestReview"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ReviewFinding_reviewId_idx"
  ON "ReviewFinding"("reviewId");

CREATE TABLE IF NOT EXISTS "ReviewEvidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "findingId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "startLine" INTEGER NOT NULL,
  "endLine" INTEGER NOT NULL,
  "revisionId" UUID,
  CONSTRAINT "ReviewEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReviewEvidence_findingId_fkey"
    FOREIGN KEY ("findingId") REFERENCES "ReviewFinding"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ReviewEvidence_findingId_idx"
  ON "ReviewEvidence"("findingId");
