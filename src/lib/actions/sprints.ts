"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireProjectAccess, canManageIssues } from "@/lib/auth/rbac";
import { serializeSprint } from "@/lib/serializers";
import { invalidateBootstrapForUser } from "@/lib/org/cache";
import type { Sprint, SprintStatus } from "@/types";

const sprintInclude = {
  _count: { select: { issues: true } },
  issues: { select: { status: true } },
} as const;

async function revalidateProjectViews(projectKey: string, userId: string, orgSlug: string) {
  await invalidateBootstrapForUser(userId, orgSlug);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectKey}`);
  revalidatePath(`/dashboard/projects/${projectKey}/sprints`);
  revalidatePath(`/dashboard/projects/${projectKey}/backlog`);
  revalidatePath(`/dashboard/projects/${projectKey}/board`);
  revalidatePath(`/dashboard/projects/${projectKey}/sprints`, "layout");
}

async function loadSprint(sprintId: string) {
  return prisma.sprint.findUnique({
    where: { id: sprintId },
    include: sprintInclude,
  });
}

async function assertCanManageSprint(userId: string, projectId: string) {
  const access = await requireProjectAccess(userId, projectId);
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
    throw new Error("FORBIDDEN");
  }
  return access;
}

export interface CreateSprintInput {
  projectId: string;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status?: SprintStatus;
}

export async function createSprint(input: CreateSprintInput): Promise<Sprint> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const access = await assertCanManageSprint(session.user.id, input.projectId);
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    include: { organization: true },
  });
  if (!project) throw new Error("NOT_FOUND");

  const name = input.name.trim();
  if (!name) throw new Error("Sprint name is required");
  if (input.endDate < input.startDate) {
    throw new Error("End date must be on or after start date");
  }

  let status = input.status ?? "planning";
  if (status === "active") {
    await prisma.sprint.updateMany({
      where: { projectId: input.projectId, status: "active" },
      data: { status: "completed" },
    });
  }

  const sprint = await prisma.sprint.create({
    data: {
      name,
      goal: input.goal?.trim() || null,
      startDate: input.startDate,
      endDate: input.endDate,
      status,
      projectId: input.projectId,
    },
    include: sprintInclude,
  });

  await revalidateProjectViews(
    project.key,
    session.user.id,
    project.organization.slug
  );
  return serializeSprint(sprint);
}

export interface UpdateSprintInput {
  name?: string;
  goal?: string;
  startDate?: Date;
  endDate?: Date;
  status?: SprintStatus;
}

export async function updateSprint(
  sprintId: string,
  input: UpdateSprintInput
): Promise<Sprint> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { project: { include: { organization: true } } },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await assertCanManageSprint(session.user.id, existing.projectId);

  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate ?? existing.endDate;
  if (endDate < startDate) {
    throw new Error("End date must be on or after start date");
  }

  if (input.status === "active") {
    await prisma.sprint.updateMany({
      where: {
        projectId: existing.projectId,
        status: "active",
        id: { not: sprintId },
      },
      data: { status: "completed" },
    });
  }

  const sprint = await prisma.sprint.update({
    where: { id: sprintId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.goal !== undefined && { goal: input.goal.trim() || null }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.status !== undefined && { status: input.status }),
    },
    include: sprintInclude,
  });

  await revalidateProjectViews(
    existing.project.key,
    session.user.id,
    existing.project.organization.slug
  );
  return serializeSprint(sprint);
}

export async function startSprint(sprintId: string): Promise<Sprint> {
  return updateSprint(sprintId, { status: "active" });
}

export async function completeSprint(
  sprintId: string,
  moveIncompleteToBacklog = true
): Promise<Sprint> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { project: { include: { organization: true } } },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await assertCanManageSprint(session.user.id, existing.projectId);

  await prisma.$transaction(async (tx) => {
    if (moveIncompleteToBacklog) {
      await tx.issue.updateMany({
        where: {
          sprintId,
          status: { notIn: ["done", "cancelled"] },
        },
        data: { sprintId: null },
      });
    }
    await tx.sprint.update({
      where: { id: sprintId },
      data: { status: "completed" },
    });
  });

  const sprint = await loadSprint(sprintId);
  if (!sprint) throw new Error("NOT_FOUND");

  await revalidateProjectViews(
    existing.project.key,
    session.user.id,
    existing.project.organization.slug
  );
  return serializeSprint(sprint);
}

export async function deleteSprint(sprintId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { project: { include: { organization: true } } },
  });
  if (!existing) throw new Error("NOT_FOUND");

  await assertCanManageSprint(session.user.id, existing.projectId);

  await prisma.$transaction([
    prisma.issue.updateMany({
      where: { sprintId },
      data: { sprintId: null },
    }),
    prisma.sprint.delete({ where: { id: sprintId } }),
  ]);

  await revalidateProjectViews(
    existing.project.key,
    session.user.id,
    existing.project.organization.slug
  );
}

export async function setIssueSprint(
  issueId: string,
  sprintId: string | null
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: { include: { organization: true } } },
  });
  if (!issue) throw new Error("NOT_FOUND");

  await assertCanManageSprint(session.user.id, issue.projectId);

  if (sprintId) {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint || sprint.projectId !== issue.projectId) {
      throw new Error("Sprint must belong to the same project");
    }
  }

  await prisma.issue.update({
    where: { id: issueId },
    data: { sprintId },
  });

  await revalidateProjectViews(
    issue.project.key,
    session.user.id,
    issue.project.organization.slug
  );
}
