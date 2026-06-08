"use client";

import { StatusBadge } from "@/components/ui/issue-badges";
import {
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
} from "@/lib/projects/workflow-status";
import { useDataStore } from "@/store/data-store";
import type { IssueStatus } from "@/types";

export function ProjectStatusBadge({
  projectId,
  status,
  className,
}: {
  projectId: string;
  status: IssueStatus;
  className?: string;
}) {
  const getWorkflowStatuses = useDataStore((s) => s.getWorkflowStatuses);
  const statuses = getWorkflowStatuses(projectId);
  return (
    <StatusBadge
      status={status}
      label={getWorkflowStatusLabel(statuses, status)}
      color={getWorkflowStatusColor(statuses, status)}
      className={className}
    />
  );
}
