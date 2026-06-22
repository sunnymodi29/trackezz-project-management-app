"use server";

import { auth } from "@/auth";
import { requireProjectAccess } from "@/lib/auth/rbac";
import {
  updateIssueStatus,
  type IssueQuickPatch,
} from "@/lib/actions/issues";
import { validateIssueStatusChangeProposal } from "@/lib/ai/issue-status-proposal";
import type { IssueStatus } from "@/types";

export async function applyAssistantIssueStatusProposal(input: {
  projectId: string;
  issueId: string;
  toStatus: string;
}): Promise<IssueQuickPatch> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireProjectAccess(session.user.id, input.projectId);

  const v = await validateIssueStatusChangeProposal(
    session.user.id,
    input.projectId,
    {
      issueId: input.issueId,
      toStatus: input.toStatus,
      reason: "apply",
    },
  );

  if (v.phase === "validation_error") {
    throw new Error(v.message);
  }

  return updateIssueStatus(input.issueId, v.toStatus as IssueStatus);
}
