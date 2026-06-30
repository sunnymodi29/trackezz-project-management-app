-- AlterTable: one subscription per organization
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateTable
CREATE TABLE "UsageMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsageMetric_organizationId_metric_period_key" ON "UsageMetric"("organizationId", "metric", "period");
CREATE INDEX "UsageMetric_organizationId_period_idx" ON "UsageMetric"("organizationId", "period");

ALTER TABLE "UsageMetric" ADD CONSTRAINT "UsageMetric_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Default subscription status for new free orgs
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'active';
