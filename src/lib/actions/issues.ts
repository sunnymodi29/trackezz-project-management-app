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
import {
  assertParentIssueForCreate,
  assertValidIssueParent,
} from "@/lib/issues/parent-validation";
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
  parentId?: string | null;
}

/** Partial issue fields returned by fast list/board/detail field updates. */
export interface IssueQuickPatch {
  id: string;
  status?: IssueStatus;
  priority?: Priority;
  assigneeIds?: string[];
  dueDate?: Date | null;
  sprintId?: string | null;
  parentId?: string | null;
  kanbanOrder?: number;
  updatedAt: Date;
}

export interface IssueQuickPatchInput {
  status?: IssueStatus;
  priority?: Priority;
  assigneeIds?: string[];
  dueDate?: Date | null;
  sprintId?: string | null;
  parentId?: string | null;
}

function sameUserIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
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
  revalidatePath(`/dashboard/projects/${projectKey}/issues`);
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
  /** Sub-issue of this issue (same project). */
  parentId?: string | null;
  /** When creating under a parent, inherit sprint from parent if omitted. */
  sprintId?: string | null;
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

  await assertParentIssueForCreate(input.projectId, input.parentId ?? undefined);

  let sprintId: string | null | undefined = input.sprintId;
  if (input.parentId && sprintId === undefined) {
    const parentRow = await prisma.issue.findUnique({
      where: { id: input.parentId },
      select: { sprintId: true },
    });
    sprintId = parentRow?.sprintId ?? null;
  }

  const sprintScope =
    sprintId === undefined || sprintId === null ? null : sprintId;

  const maxKanban = await prisma.issue.aggregate({
    where: {
      projectId: input.projectId,
      status: input.status,
      sprintId: sprintScope === null ? { equals: null } : sprintScope,
    },
    _max: { kanbanOrder: true },
  });
  const nextKanbanOrder = (maxKanban._max.kanbanOrder ?? -1) + 1;

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
      parentId: input.parentId ?? undefined,
      sprintId: sprintId ?? undefined,
      kanbanOrder: nextKanbanOrder,
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

  const parentKey = input.parentId
    ? (
        await prisma.issue.findUnique({
          where: { id: input.parentId },
          select: { issueKey: true },
        })
      )?.issueKey
    : null;

  await logIssueActivity(
    userId,
    issue.id,
    input.projectId,
    access.organizationId,
    "created issue",
    parentKey
      ? `${issueKey}: ${issue.title} (sub-issue of ${parentKey})`
      : `${issueKey}: ${issue.title}`
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
      parentId: true,
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

  if (input.parentId !== undefined) {
    await assertValidIssueParent({
      issueId,
      projectId: existing.projectId,
      parentId: input.parentId,
    });
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
      ...(input.parentId !== undefined && { parentId: input.parentId }),
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
  if (input.parentId !== undefined) {
    changes.push(
      input.parentId ? `parent → ${input.parentId}` : "detached from parent",
    );
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
  assigneesChanged?: boolean;
  newlyAssigned?: string[];
  dueDateChanged?: boolean;
  newDueDate?: Date | null;
  sprintChanged?: boolean;
  parentChanged?: boolean;
}) {
  after(async () => {
    const changes: string[] = [];
    if (params.newStatus !== undefined) {
      changes.push(`status → ${params.newStatus}`);
    }
    if (params.newPriority !== undefined) {
      changes.push(`priority → ${params.newPriority}`);
    }
    if (params.assigneesChanged) {
      changes.push("assignees");
    }
    if (params.dueDateChanged) {
      changes.push(
        params.newDueDate
          ? `due date → ${params.newDueDate.toLocaleDateString()}`
          : "due date cleared",
      );
    }
    if (params.sprintChanged) {
      changes.push("sprint");
    }
    if (params.parentChanged) {
      changes.push("parent");
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

    if (params.newlyAssigned && params.newlyAssigned.length > 0) {
      await notifyIssueAssigned({
        issueId: params.issueId,
        issueKey: params.issueKey,
        issueTitle: params.issueTitle,
        assigneeIds: params.newlyAssigned,
        actorId: params.userId,
        organizationSlug: params.orgSlug,
      });
    }

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
      dueDate: true,
      sprintId: true,
      parentId: true,
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

  const priorAssigneeIds = existing.assignees.map((a) => a.userId);
  const issueData: {
    status?: string;
    priority?: Priority;
    dueDate?: Date | null;
    sprintId?: string | null;
    parentId?: string | null;
    kanbanOrder?: number;
  } = {};
  let statusLabel: string | undefined;
  let assigneesChanged = false;
  let newlyAssigned: string[] = [];
  let dueDateChanged = false;
  let sprintChanged = false;
  let parentChanged = false;

  if (input.status !== undefined && input.status !== existing.status) {
    const row = await assertValidProjectStatus(existing.projectId, input.status);
    issueData.status = input.status;
    statusLabel = row.label;

    const maxInTarget = await prisma.issue.aggregate({
      where: {
        projectId: existing.projectId,
        status: input.status,
        sprintId:
          existing.sprintId === null || existing.sprintId === undefined
            ? { equals: null }
            : existing.sprintId,
      },
      _max: { kanbanOrder: true },
    });
    issueData.kanbanOrder = (maxInTarget._max.kanbanOrder ?? -1) + 1;
  }

  if (input.priority !== undefined && input.priority !== existing.priority) {
    issueData.priority = input.priority;
  }

  if (input.dueDate !== undefined) {
    const nextDue = input.dueDate;
    const prevDue = existing.dueDate;
    const unchanged =
      (nextDue === null && !prevDue) ||
      (nextDue !== null &&
        prevDue !== null &&
        nextDue.getTime() === prevDue.getTime());
    if (!unchanged) {
      issueData.dueDate = input.dueDate;
      dueDateChanged = true;
    }
  }

  if (input.sprintId !== undefined && input.sprintId !== existing.sprintId) {
    issueData.sprintId = input.sprintId;
    sprintChanged = true;
  }

  if (input.parentId !== undefined) {
    const next = input.parentId;
    const prev = existing.parentId;
    const same =
      (next === null && !prev) || (next !== null && prev !== null && next === prev);
    if (!same) {
      await assertValidIssueParent({
        issueId,
        projectId: existing.projectId,
        parentId: next,
      });
      issueData.parentId = next;
      parentChanged = true;
    }
  }

  if (
    input.assigneeIds !== undefined &&
    !sameUserIdSet(input.assigneeIds, priorAssigneeIds)
  ) {
    assigneesChanged = true;
    newlyAssigned = input.assigneeIds.filter(
      (id) => !priorAssigneeIds.includes(id),
    );
    await prisma.issueAssignee.deleteMany({ where: { issueId } });
    if (input.assigneeIds.length > 0) {
      await prisma.issueAssignee.createMany({
        data: input.assigneeIds.map((userId) => ({ issueId, userId })),
      });
    }
  }

  const hasChanges =
    Object.keys(issueData).length > 0 || assigneesChanged;

  if (!hasChanges) {
    return {
      id: issueId,
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.assigneeIds !== undefined ? { assigneeIds: input.assigneeIds } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate ?? null } : {}),
      ...(input.sprintId !== undefined ? { sprintId: input.sprintId ?? null } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId ?? null } : {}),
      updatedAt: new Date(),
    };
  }

  const updated = await prisma.issue.update({
    where: { id: issueId },
    data: {
      ...issueData,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      priority: true,
      dueDate: true,
      sprintId: true,
      parentId: true,
      kanbanOrder: true,
      updatedAt: true,
    },
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
    priorAssigneeIds,
    reporterId: existing.reporterId,
    newStatus: issueData.status,
    newPriority: issueData.priority,
    statusLabel,
    assigneesChanged,
    newlyAssigned,
    dueDateChanged,
    newDueDate: input.dueDate,
    sprintChanged,
    parentChanged,
  });

  return {
    id: updated.id,
    ...(issueData.status !== undefined ? { status: updated.status } : {}),
    ...(issueData.priority !== undefined ? { priority: updated.priority } : {}),
    ...(input.assigneeIds !== undefined ? { assigneeIds: input.assigneeIds } : {}),
    ...(issueData.dueDate !== undefined
      ? { dueDate: updated.dueDate }
      : input.dueDate !== undefined
        ? { dueDate: input.dueDate ?? null }
        : {}),
    ...(issueData.sprintId !== undefined
      ? { sprintId: updated.sprintId }
      : input.sprintId !== undefined
        ? { sprintId: input.sprintId ?? null }
        : {}),
    ...(issueData.parentId !== undefined
      ? { parentId: updated.parentId }
      : input.parentId !== undefined
        ? { parentId: input.parentId ?? null }
        : {}),
    ...(issueData.kanbanOrder !== undefined
      ? { kanbanOrder: updated.kanbanOrder }
      : {}),
    updatedAt: updated.updatedAt,
  };
}

export async function updateIssueStatus(
  issueId: string,
  status: IssueStatus,
): Promise<IssueQuickPatch> {
  return patchIssueFields(issueId, { status });
}

export interface KanbanOrderUpdate {
  issueId: string;
  kanbanOrder: number;
}

/** Persists Kanban column order (same status + sprint scope). */
export async function reorderKanbanIssues(
  updates: KanbanOrderUpdate[],
): Promise<{ id: string; kanbanOrder: number; updatedAt: Date }[]> {
  if (updates.length === 0) return [];

  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ids = [...new Set(updates.map((u) => u.issueId))];
  if (ids.length !== updates.length) {
    throw new Error("INVALID: Duplicate issue ids in reorder payload");
  }

  const rows = await prisma.issue.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      projectId: true,
      status: true,
      sprintId: true,
      project: {
        select: {
          key: true,
          organizationId: true,
          organization: { select: { slug: true, ownerId: true } },
        },
      },
    },
  });
  if (rows.length !== ids.length) throw new Error("NOT_FOUND: Issue not found");

  const projectId = rows[0].projectId;
  if (!rows.every((r) => r.projectId === projectId)) {
    throw new Error("INVALID: Issues must belong to the same project");
  }

  const status = rows[0].status;
  if (!rows.every((r) => r.status === status)) {
    throw new Error("INVALID: Issues must share the same status column");
  }

  const sprintKey = rows[0].sprintId ?? null;
  if (!rows.every((r) => (r.sprintId ?? null) === sprintKey)) {
    throw new Error("INVALID: Issues must share the same sprint scope");
  }

  const access = await requireProjectAccess(session.user.id, projectId);
  const org = rows[0].project.organization;

  if (
    !canManageIssues(access.projectMember, {
      userId: session.user.id,
      organization: org,
      orgMember: access.orgMember,
      isOrgWideProjectAdmin: access.isOrgWideProjectAdmin,
    })
  ) {
    throw new Error("FORBIDDEN: Cannot reorder issues in this project");
  }

  const now = new Date();
  const results = await prisma.$transaction(
    updates.map((u) =>
      prisma.issue.update({
        where: { id: u.issueId },
        data: { kanbanOrder: u.kanbanOrder, updatedAt: now },
        select: { id: true, kanbanOrder: true, updatedAt: true },
      }),
    ),
  );

  await revalidateIssueViews(
    rows[0].project.key,
    session.user.id,
    org.slug,
  );
  return results;
}

