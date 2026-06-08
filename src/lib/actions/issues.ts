"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { invalidateBootstrapForUser } from "@/lib/org/cache";
import { requireProjectAccess, canManageIssues } from "@/lib/auth/rbac";
import { issueInclude } from "@/lib/queries/issues";
import { serializeIssue } from "@/lib/serializers";
import {
  notifyIssueAssigned,
  notifyIssueStatusChange,
} from "@/lib/notifications/service";
import { getWorkflowStatusLabel } from "@/lib/projects/workflow-status";
import { assertValidProjectStatus } from "@/lib/projects/workflow-status.server";
import type { Issue, IssueStatus, IssueType, Priority } from "@/types";

async function statusLabelFor(projectId: string, statusKey: string) {
  const rows = await prisma.workflowStatus.findMany({
    where: { projectId },
  });
  return getWorkflowStatusLabel(
    rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      key: r.key,
      label: r.label,
      color: r.color,
      position: r.position,
      createdAt: r.createdAt,
    })),
    statusKey,
  );
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: Priority;
  assigneeIds?: string[];
  dueDate?: Date | null;
  sprintId?: string | null;
}

/** Partial issue fields returned by fast list/board updates. */
export interface IssueQuickPatch {
  id: string;
  status?: IssueStatus;
  priority?: Priority;
  updatedAt: Date;
}

export interface IssueQuickPatchInput {
  status?: IssueStatus;
  priority?: Priority;
}

async function revalidateIssueViews(
  projectKey: string,
  userId: string,
  orgSlug: string,
  issueId?: string
) {
  await invalidateBootstrapForUser(userId, orgSlug);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-tasks");
  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/projects/${projectKey}`);
  revalidatePath(`/dashboard/projects/${projectKey}/calendar`);
  revalidatePath(`/dashboard/projects/${projectKey}/sprints`);
  revalidatePath(`/dashboard/projects/${projectKey}/backlog`);
  revalidatePath(`/dashboard/projects/${projectKey}/board`);
  if (issueId) {
    revalidatePath(`/dashboard/projects/${projectKey}/issues/${issueId}`);
  }
}

async function logIssueActivity(
  userId: string,
  issueId: string,
  projectId: string,
  organizationId: string,
  action: string,
  details: string
) {
  await prisma.activityLog.create({
    data: {
      action,
      details,
      userId,
      issueId,
      projectId,
      organizationId,
    },
  });
}

export interface CreateIssueInput {
  projectId: string;
  title: string;
  description?: string;
  type: IssueType;
  status: IssueStatus;
  priority: Priority;
  estimate?: number;
  assigneeIds?: string[];
  dueDate?: Date;
  reporterId: string;
  reproductionSteps?: string;
  expectedResult?: string;
  actualResult?: string;
  environment?: string;
}

export async function createIssue(input: CreateIssueInput) {
  const session = await auth();
  const userId = session?.user?.id ?? input.reporterId;
  if (!userId) throw new Error("Unauthorized");

  const access = await requireProjectAccess(userId, input.projectId);
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
  });
  if (!org) throw new Error("NOT_FOUND");

  if (
    !canManageIssues(access.projectMember, {
      userId,
      organization: org,
      orgMember: access.orgMember,
      isOrgWideProjectAdmin: access.isOrgWideProjectAdmin,
    })
  ) {
    throw new Error("FORBIDDEN: Cannot create issues in this project");
  }

  const project = await prisma.project.update({
    where: { id: input.projectId },
    data: { issueCounter: { increment: 1 } },
    include: { organization: { select: { slug: true } } },
  });

  const issueNumber = project.issueCounter;
  const issueKey = `${project.key}-${issueNumber}`;

  await assertValidProjectStatus(input.projectId, input.status);

  const issue = await prisma.issue.create({
    data: {
      issueNumber,
      issueKey,
      title: input.title.trim(),
      description: input.description,
      type: input.type,
      status: input.status,
      priority: input.priority,
      reporterId: userId,
      projectId: input.projectId,
      estimate: input.estimate,
      dueDate: input.dueDate,
      reproductionSteps: input.reproductionSteps,
      expectedResult: input.expectedResult,
      actualResult: input.actualResult,
      environment: input.environment,
      assignees: input.assigneeIds?.length
        ? {
            create: input.assigneeIds.map((uid) => ({ userId: uid })),
          }
        : undefined,
    },
    include: issueInclude,
  });

  await logIssueActivity(
    userId,
    issue.id,
    input.projectId,
    access.organizationId,
    "created issue",
    `${issueKey}: ${issue.title}`
  );

  if (input.assigneeIds?.length) {
    await notifyIssueAssigned({
      issueId: issue.id,
      issueKey,
      issueTitle: issue.title,
      assigneeIds: input.assigneeIds,
      actorId: userId,
      organizationSlug: project.organization.slug,
    });
  }

  await revalidateIssueViews(project.key, userId, project.organization.slug, issue.id);
  return serializeIssue(issue);
}

export async function updateIssue(
  issueId: string,
  input: UpdateIssueInput
): Promise<Issue> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      issueKey: true,
      title: true,
      status: true,
      reporterId: true,
      projectId: true,
      assignees: { select: { userId: true } },
      project: {
        select: { key: true, organizationId: true, organization: { select: { slug: true, ownerId: true } } },
      },
    },
  });
  if (!existing) throw new Error("NOT_FOUND: Issue not found");

  const access = await requireProjectAccess(session.user.id, existing.projectId);
  const org = existing.project.organization;
  const orgSlug = org.slug;

  if (
    !canManageIssues(access.projectMember, {
      userId: session.user.id,
      organization: org,
      orgMember: access.orgMember,
      isOrgWideProjectAdmin: access.isOrgWideProjectAdmin,
    })
  ) {
    throw new Error("FORBIDDEN: Cannot update issues in this project");
  }

  const priorAssigneeIds = existing.assignees.map((a) => a.userId);

  if (input.status !== undefined) {
    await assertValidProjectStatus(existing.projectId, input.status);
  }

  if (input.assigneeIds !== undefined) {
    await prisma.issueAssignee.deleteMany({ where: { issueId } });
    if (input.assigneeIds.length > 0) {
      await prisma.issueAssignee.createMany({
        data: input.assigneeIds.map((uid) => ({ issueId, userId: uid })),
      });
    }
  }

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data: {
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.sprintId !== undefined && { sprintId: input.sprintId }),
    },
    include: issueInclude,
  });

  const changes: string[] = [];
  if (input.title !== undefined) changes.push("title");
  if (input.description !== undefined) changes.push("description");
  if (input.status !== undefined) changes.push(`status → ${input.status}`);
  if (input.priority !== undefined) changes.push(`priority → ${input.priority}`);
  if (input.assigneeIds !== undefined) changes.push("assignees");
  if (input.dueDate !== undefined) {
    changes.push(
      input.dueDate
        ? `due date → ${input.dueDate.toLocaleDateString()}`
        : "due date cleared"
    );
  }
  if (input.sprintId !== undefined) {
    changes.push(input.sprintId ? "moved to sprint" : "removed from sprint");
  }

  if (changes.length > 0) {
    await logIssueActivity(
      session.user.id,
      issueId,
      existing.projectId,
      existing.project.organizationId,
      "updated issue",
      `${existing.issueKey}: ${changes.join(", ")}`
    );
  }

  if (input.assigneeIds !== undefined) {
    const newlyAssigned = input.assigneeIds.filter(
      (id) => !priorAssigneeIds.includes(id)
    );
    if (newlyAssigned.length > 0) {
      await notifyIssueAssigned({
        issueId,
        issueKey: existing.issueKey,
        issueTitle: issue.title,
        assigneeIds: newlyAssigned,
        actorId: session.user.id,
        organizationSlug: orgSlug,
      });
    }
  }

  if (input.status !== undefined && input.status !== existing.status) {
    const watcherIds = [
      ...priorAssigneeIds,
      existing.reporterId,
    ];
    await notifyIssueStatusChange({
      issueId,
      issueKey: existing.issueKey,
      issueTitle: issue.title,
      statusLabel: await statusLabelFor(existing.projectId, input.status),
      recipientIds: watcherIds,
      actorId: session.user.id,
      organizationSlug: orgSlug,
    });
  }

  await revalidateIssueViews(
    existing.project.key,
    session.user.id,
    org.slug,
    issueId
  );
  return serializeIssue(issue);
}

export async function deleteIssue(issueId: string): Promise<{ projectKey: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      issueKey: true,
      projectId: true,
      project: {
        select: { key: true, organizationId: true, organization: { select: { slug: true, ownerId: true } } },
      },
    },
  });
  if (!existing) throw new Error("NOT_FOUND: Issue not found");

  const access = await requireProjectAccess(session.user.id, existing.projectId);
  const org = existing.project.organization;

  if (
    !canManageIssues(access.projectMember, {
      userId: session.user.id,
      organization: org,
      orgMember: access.orgMember,
      isOrgWideProjectAdmin: access.isOrgWideProjectAdmin,
    })
  ) {
    throw new Error("FORBIDDEN: Cannot delete issues in this project");
  }

  await logIssueActivity(
    session.user.id,
    issueId,
    existing.projectId,
    existing.project.organizationId,
    "deleted issue",
    existing.issueKey
  );

  await prisma.issue.delete({ where: { id: issueId } });

  await revalidateIssueViews(existing.project.key, session.user.id, org.slug);
  return { projectKey: existing.project.key };
}

async function scheduleQuickPatchSideEffects(params: {
  userId: string;
  issueId: string;
  issueKey: string;
  issueTitle: string;
  projectId: string;
  organizationId: string;
  orgSlug: string;
  priorStatus: string;
  priorAssigneeIds: string[];
  reporterId: string;
  newStatus?: IssueStatus;
  newPriority?: Priority;
  statusLabel?: string;
}) {
  after(async () => {
    const changes: string[] = [];
    if (params.newStatus !== undefined) {
      changes.push(`status → ${params.newStatus}`);
    }
    if (params.newPriority !== undefined) {
      changes.push(`priority → ${params.newPriority}`);
    }
    if (changes.length === 0) return;

    await logIssueActivity(
      params.userId,
      params.issueId,
      params.projectId,
      params.organizationId,
      "updated issue",
      `${params.issueKey}: ${changes.join(", ")}`,
    );

    if (
      params.newStatus !== undefined &&
      params.newStatus !== params.priorStatus &&
      params.statusLabel
    ) {
      await notifyIssueStatusChange({
        issueId: params.issueId,
        issueKey: params.issueKey,
        issueTitle: params.issueTitle,
        statusLabel: params.statusLabel,
        recipientIds: [...params.priorAssigneeIds, params.reporterId],
        actorId: params.userId,
        organizationSlug: params.orgSlug,
      });
    }
  });
}

export async function patchIssueFields(
  issueId: string,
  input: IssueQuickPatchInput,
): Promise<IssueQuickPatch> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      issueKey: true,
      title: true,
      status: true,
      priority: true,
      reporterId: true,
      projectId: true,
      assignees: { select: { userId: true } },
      project: {
        select: {
          key: true,
          organizationId: true,
          organization: { select: { slug: true, ownerId: true } },
        },
      },
    },
  });
  if (!existing) throw new Error("NOT_FOUND: Issue not found");

  const access = await requireProjectAccess(session.user.id, existing.projectId);
  const org = existing.project.organization;

  if (
    !canManageIssues(access.projectMember, {
      userId: session.user.id,
      organization: org,
      orgMember: access.orgMember,
      isOrgWideProjectAdmin: access.isOrgWideProjectAdmin,
    })
  ) {
    throw new Error("FORBIDDEN: Cannot update issues in this project");
  }

  const data: { status?: string; priority?: Priority } = {};
  let statusLabel: string | undefined;

  if (input.status !== undefined) {
    if (input.status === existing.status) {
      return {
        id: issueId,
        status: input.status,
        updatedAt: new Date(),
      };
    }
    const row = await assertValidProjectStatus(existing.projectId, input.status);
    data.status = input.status;
    statusLabel = row.label;
  }

  if (input.priority !== undefined && input.priority !== existing.priority) {
    data.priority = input.priority;
  }

  if (Object.keys(data).length === 0) {
    return {
      id: issueId,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      updatedAt: new Date(),
    };
  }

  const updated = await prisma.issue.update({
    where: { id: issueId },
    data,
    select: { id: true, status: true, priority: true, updatedAt: true },
  });

  await scheduleQuickPatchSideEffects({
    userId: session.user.id,
    issueId,
    issueKey: existing.issueKey,
    issueTitle: existing.title,
    projectId: existing.projectId,
    organizationId: existing.project.organizationId,
    orgSlug: org.slug,
    priorStatus: existing.status,
    priorAssigneeIds: existing.assignees.map((a) => a.userId),
    reporterId: existing.reporterId,
    newStatus: data.status,
    newPriority: data.priority,
    statusLabel,
  });

  return {
    id: updated.id,
    ...(data.status !== undefined ? { status: updated.status } : {}),
    ...(data.priority !== undefined ? { priority: updated.priority } : {}),
    updatedAt: updated.updatedAt,
  };
}

export async function updateIssueStatus(
  issueId: string,
  status: IssueStatus,
): Promise<IssueQuickPatch> {
  return patchIssueFields(issueId, { status });
}

