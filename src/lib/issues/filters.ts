export type AssigneeFilterValue = "all" | "unassigned" | (string & {});

export function issueMatchesAssigneeFilter(
  issue: { assigneeIds: string[] },
  filter: AssigneeFilterValue,
): boolean {
  if (filter === "all") return true;
  if (filter === "unassigned") return issue.assigneeIds.length === 0;
  return issue.assigneeIds.includes(filter);
}

export function buildAssigneeFilterOptions(
  users: { id: string; name: string; avatarUrl?: string }[],
) {
  return [
    { value: "all" as const, label: "All assignees" },
    { value: "unassigned" as const, label: "Unassigned" },
    ...users.map((u) => ({
      value: u.id,
      label: u.name,
      avatarUrl: u.avatarUrl,
      showAvatar: true as const,
    })),
  ];
}
