-- Kanban column ordering within status (per issue row).
ALTER TABLE "Issue" ADD COLUMN "kanbanOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Issue_projectId_status_sprintId_kanbanOrder_idx" ON "Issue"("projectId", "status", "sprintId", "kanbanOrder");
