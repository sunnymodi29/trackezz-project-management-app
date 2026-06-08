import type { WorkflowStatus } from "@/types";

export const DEFAULT_WORKFLOW_STATUSES: Omit<
  WorkflowStatus,
  "id" | "projectId" | "createdAt"
>[] = [
  { key: "backlog", label: "Backlog", color: "#71717a", position: 0 },
  { key: "todo", label: "Todo", color: "#a1a1aa", position: 1 },
  { key: "in-progress", label: "In Progress", color: "#60a5fa", position: 2 },
  { key: "in-review", label: "In Review", color: "#c084fc", position: 3 },
  { key: "done", label: "Done", color: "#34d399", position: 4 },
  { key: "cancelled", label: "Cancelled", color: "#f87171", position: 5 },
];

export function slugifyStatusKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "status";
}

export function sortWorkflowStatuses(
  statuses: WorkflowStatus[],
): WorkflowStatus[] {
  return [...statuses].sort((a, b) => a.position - b.position);
}

export function getWorkflowStatusLabel(
  statuses: WorkflowStatus[],
  key: string,
): string {
  return (
    statuses.find((s) => s.key === key)?.label ??
    DEFAULT_WORKFLOW_STATUSES.find((s) => s.key === key)?.label ??
    key
  );
}

export function getWorkflowStatusColor(
  statuses: WorkflowStatus[],
  key: string,
): string {
  return (
    statuses.find((s) => s.key === key)?.color ??
    DEFAULT_WORKFLOW_STATUSES.find((s) => s.key === key)?.color ??
    "#71717a"
  );
}

export function workflowStatusSelectOptions(
  statuses: WorkflowStatus[],
): { value: string; label: string }[] {
  return sortWorkflowStatuses(statuses).map((s) => ({
    value: s.key,
    label: s.label,
  }));
}

export function randomStatusColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 55 + Math.floor(Math.random() * 25);
  const lightness = 48 + Math.floor(Math.random() * 12);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

