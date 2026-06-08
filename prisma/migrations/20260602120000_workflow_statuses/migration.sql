-- WorkflowStatus table + Issue.status as text (per-project custom statuses)

CREATE TABLE "WorkflowStatus" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#71717a',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowStatus_projectId_key_key" ON "WorkflowStatus"("projectId", "key");
CREATE INDEX "WorkflowStatus_projectId_position_idx" ON "WorkflowStatus"("projectId", "position");

ALTER TABLE "WorkflowStatus" ADD CONSTRAINT "WorkflowStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Convert Issue.status enum to app-style string keys
ALTER TABLE "Issue" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Issue" ALTER COLUMN "status" TYPE TEXT USING (
  CASE "status"::text
    WHEN 'in_progress' THEN 'in-progress'
    WHEN 'in_review' THEN 'in-review'
    ELSE "status"::text
  END
);
ALTER TABLE "Issue" ALTER COLUMN "status" SET DEFAULT 'backlog';

DROP TYPE "IssueStatus";

-- Seed default workflow columns for every existing project
INSERT INTO "WorkflowStatus" ("id", "projectId", "key", "label", "color", "position")
SELECT
  'ws_' || p."id" || '_backlog',
  p."id",
  'backlog',
  'Backlog',
  '#71717a',
  0
FROM "Project" p;

INSERT INTO "WorkflowStatus" ("id", "projectId", "key", "label", "color", "position")
SELECT 'ws_' || p."id" || '_todo', p."id", 'todo', 'Todo', '#a1a1aa', 1 FROM "Project" p;

INSERT INTO "WorkflowStatus" ("id", "projectId", "key", "label", "color", "position")
SELECT 'ws_' || p."id" || '_in_progress', p."id", 'in-progress', 'In Progress', '#60a5fa', 2 FROM "Project" p;

INSERT INTO "WorkflowStatus" ("id", "projectId", "key", "label", "color", "position")
SELECT 'ws_' || p."id" || '_in_review', p."id", 'in-review', 'In Review', '#c084fc', 3 FROM "Project" p;

INSERT INTO "WorkflowStatus" ("id", "projectId", "key", "label", "color", "position")
SELECT 'ws_' || p."id" || '_done', p."id", 'done', 'Done', '#34d399', 4 FROM "Project" p;

INSERT INTO "WorkflowStatus" ("id", "projectId", "key", "label", "color", "position")
SELECT 'ws_' || p."id" || '_cancelled', p."id", 'cancelled', 'Cancelled', '#f87171', 5 FROM "Project" p;
