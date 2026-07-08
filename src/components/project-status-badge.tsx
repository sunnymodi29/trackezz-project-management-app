"use client";

import { StatusBadge } from "@/components/ui/issue-badges";
import {
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
  statusColorWithAlpha,
} from "@/lib/projects/workflow-status";
import { useDataStore } from "@/store/data-store";
import type { IssueStatus } from "@/types";

export function ProjectStatusBadge({
  projectId,
  status,
  className,
  backgroundColor,
  borderColor,
}: {
  projectId: string;
  status: IssueStatus;
  className?: string;
  backgroundColor?: string;
  borderColor?: string;
}) {
  const getWorkflowStatuses = useDataStore((s) => s.getWorkflowStatuses);
  const statuses = getWorkflowStatuses(projectId);
  const color = getWorkflowStatusColor(statuses, status);
  return (
    <StatusBadge
      status={status}
      label={getWorkflowStatusLabel(statuses, status)}
      color={color}
      backgroundColor={
        backgroundColor ?? statusColorWithAlpha(color, 0.082)
      }
      borderColor={borderColor ?? statusColorWithAlpha(color, 0.25)}
      className={className}
    />
  );
}
