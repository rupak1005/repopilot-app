-- Phase 7: GitHub webhook integration metadata

CREATE TABLE "WebhookDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "deliveryId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "action" TEXT,
  "repositoryId" UUID,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebhookDelivery_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "WebhookDelivery_deliveryId_key"
  ON "WebhookDelivery"("deliveryId");
CREATE INDEX "WebhookDelivery_repositoryId_idx"
  ON "WebhookDelivery"("repositoryId");

CREATE TABLE "PullRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "repositoryId" UUID NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "authorLogin" TEXT,
  "baseBranch" TEXT NOT NULL,
  "headBranch" TEXT NOT NULL,
  "baseRevision" TEXT NOT NULL,
  "headRevision" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PullRequest_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PullRequest_repositoryId_number_key"
  ON "PullRequest"("repositoryId", "number");
CREATE INDEX "PullRequest_repositoryId_idx"
  ON "PullRequest"("repositoryId");

CREATE TABLE "PullRequestRevision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pullRequestId" UUID NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "baseRevision" TEXT NOT NULL,
  "headRevision" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PullRequestRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PullRequestRevision_pullRequestId_fkey"
    FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PullRequestRevision_pullRequestId_headRevision_key"
  ON "PullRequestRevision"("pullRequestId", "headRevision");
CREATE INDEX "PullRequestRevision_pullRequestId_idx"
  ON "PullRequestRevision"("pullRequestId");

CREATE TABLE "QueuedJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" TEXT NOT NULL,
  "repositoryId" UUID NOT NULL,
  "pullRequestId" UUID,
  "deliveryId" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QueuedJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QueuedJob_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE,
  CONSTRAINT "QueuedJob_pullRequestId_fkey"
    FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "QueuedJob_dedupeKey_key"
  ON "QueuedJob"("dedupeKey");
CREATE INDEX "QueuedJob_repositoryId_idx"
  ON "QueuedJob"("repositoryId");
CREATE INDEX "QueuedJob_pullRequestId_idx"
  ON "QueuedJob"("pullRequestId");
