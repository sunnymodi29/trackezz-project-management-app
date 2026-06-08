import type { UpdateIssueInput } from "@/lib/actions/issues";

export function isQuickIssuePatch(
  input: UpdateIssueInput,
): input is Pick<UpdateIssueInput, "status" | "priority"> {
  const keys = (Object.keys(input) as (keyof UpdateIssueInput)[]).filter(
    (key) => input[key] !== undefined,
  );
  return (
    keys.length > 0 &&
    keys.every((key) => key === "status" || key === "priority")
  );
}
