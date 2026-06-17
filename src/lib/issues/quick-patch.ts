import type { UpdateIssueInput } from "@/lib/actions/issues";

const QUICK_PATCH_KEYS = [
  "status",
  "priority",
  "assigneeIds",
  "dueDate",
  "sprintId",
  "parentId",
] as const satisfies readonly (keyof UpdateIssueInput)[];

export function isQuickIssuePatch(input: UpdateIssueInput): boolean {
  const keys = (Object.keys(input) as (keyof UpdateIssueInput)[]).filter(
    (key) => input[key] !== undefined,
  );
  return (
    keys.length > 0 &&
    keys.every((key) =>
      (QUICK_PATCH_KEYS as readonly string[]).includes(key),
    )
  );
}
