CREATE TABLE IF NOT EXISTS "ProductAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "path" TEXT,
  "properties" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductAnalyticsEvent_name_createdAt_idx"
  ON "ProductAnalyticsEvent"("name", "createdAt");

CREATE INDEX IF NOT EXISTS "ProductAnalyticsEvent_createdAt_idx"
  ON "ProductAnalyticsEvent"("createdAt");
