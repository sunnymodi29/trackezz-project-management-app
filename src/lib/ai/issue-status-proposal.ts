import { prisma } from "@/lib/db";
import { requireProjectAccess, canManageIssues } from "@/lib/auth/rbac";
import { assertValidProjectStatus } from "@/lib/projects/workflow-status.server";
import {
  getWorkflowStatusLabel,
  normalizeWorkflowStatusKey,
} from "@/lib/projects/workflow-status";

/** Returned from the propose-issue-status tool (server) or echoed in client-only phases. */
export type IssueStatusProposalSnapshot = {
  issueId: string;
  issueKey: string;
  issueTitle: string;
  fromStatus: string;
  fromStatusLabel: string;
  toStatus: string;
  toStatusLabel: string;
  reason: string;
};

export type IssueStatusProposalToolOutput =
  | ({ phase: "pending" } & IssueStatusProposalSnapshot)
  | { phase: "validation_error"; message: string }
  /** Client-only: user dismissed the proposal from inline chat UI. */
  | ({ phase: "rejected" } & IssueStatusProposalSnapshot)
  /** Client-only: user confirmed apply; issue was updated. */
  | ({ phase: "applied" } & IssueStatusProposalSnapshot)
  /** Client-only: a newer pending proposal replaced this one. */
  | ({ phase: "superseded" } & IssueStatusProposalSnapshot);

export async function validateIssueStatusChangeProposal(
  userId: string,
  projectId: string,
  input: { issueId: string; toStatus: string; reason: string },
): Promise<IssueStatusProposalToolOutput> {
  const reason = input.reason.trim().slice(0, 500);
  const toStatus = normalizeWorkflowStatusKey(input.toStatus);

  const existing = await prisma.issue.findFirst({
    where: { id: input.issueId, projectId },
    select: {
      id: true,
      issueKey: true,
      title: true,
      status: true,
      project: {
        select: {
          organization: { select: { ownerId: true } },
        },
      },
    },
  });
  if (!existing) {
    return {
      phase: "validation_error",
      message: "That issue was not found in this project.",
    };
  }

  const access = await requireProjectAccess(userId, projectId);
  const org = existing.project.organization;
  if (
    !canManageIssues(access.projectMember, {
      userId,
      organization: org,
      orgMember: access.orgMember,
      isOrgWideProjectAdmin: access.isOrgWideProjectAdmin,
    })
  ) {
    return {
      phase: "validation_error",
      message:
        "You do not have permission to change issue status in this project.",
    };
  }

  if (existing.status === toStatus) {
    return {
      phase: "validation_error",
      message: `That issue is already in status "${toStatus}".`,
    };
  }

  try {
    await assertValidProjectStatus(projectId, toStatus);
  } catch {
    return {
      phase: "validation_error",
      message: `Status "${toStatus}" is not valid for this project. Use a status key from the workflow list (hyphenated keys, e.g. in-progress).`,
    };
  }

  const wfRows = await prisma.workflowStatus.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });
  const wf = wfRows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    key: r.key,
    label: r.label,
    color: r.color,
    position: r.position,
    createdAt: r.createdAt,
  }));

  return {
    phase: "pending",
    issueId: existing.id,
    issueKey: existing.issueKey,
    issueTitle: existing.title,
    fromStatus: existing.status,
    fromStatusLabel: getWorkflowStatusLabel(wf, existing.status),
    toStatus,
    toStatusLabel: getWorkflowStatusLabel(wf, toStatus),
    reason: reason || "(no reason given)",
  };
}
