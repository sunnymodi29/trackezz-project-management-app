"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canManageProject, requireProjectAccess } from "@/lib/auth/rbac";
import { invalidateBootstrapForUser } from "@/lib/org/cache";
import { slugifyStatusKey } from "@/lib/projects/workflow-status";
import { assertValidProjectStatus } from "@/lib/projects/workflow-status.server";
import { serializeWorkflowStatus } from "@/lib/serializers";
import type { WorkflowStatus } from "@/types";

async function revalidateWorkflowViews(
  projectKey: string,
  userId: string,
  orgSlug: string,
) {
  await invalidateBootstrapForUser(userId, orgSlug);
  revalidatePath(`/dashboard/projects/${projectKey}`);
  revalidatePath(`/dashboard/projects/${projectKey}/list`);
  revalidatePath(`/dashboard/projects/${projectKey}/board`);
}

async function requireStatusManager(projectId: string, userId: string) {
  const access = await requireProjectAccess(userId, projectId);
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
  });
  if (!org) throw new Error("NOT_FOUND");

  if (
    !canManageProject(
      userId,
      org,
      access.orgMember,
      access.projectMember,
      access.isOrgWideProjectAdmin,
    )
  ) {
    throw new Error("FORBIDDEN: Cannot manage workflow statuses");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { key: true, organization: { select: { slug: true } } },
  });
  if (!project) throw new Error("NOT_FOUND");

  return { orgSlug: project.organization.slug, projectKey: project.key };
}

export async function createWorkflowStatus(
  projectId: string,
  input: { label: string; color?: string },
): Promise<WorkflowStatus> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const label = input.label.trim();
  if (!label) throw new Error("Status label is required");

  const { orgSlug, projectKey } = await requireStatusManager(
    projectId,
    session.user.id,
  );

  const existing = await prisma.workflowStatus.findMany({
    where: { projectId },
    select: { key: true, position: true },
    orderBy: { position: "desc" },
    take: 1,
  });

  let key = slugifyStatusKey(label);
  const taken = await prisma.workflowStatus.findMany({
    where: { projectId },
    select: { key: true },
  });
  const keys = new Set(taken.map((s) => s.key));
  if (keys.has(key)) {
    let n = 2;
    while (keys.has(`${key}-${n}`)) n += 1;
    key = `${key}-${n}`;
  }

  const position = (existing[0]?.position ?? -1) + 1;
  const color = input.color?.trim() || "#71717a";

  const row = await prisma.workflowStatus.create({
    data: { projectId, key, label, color, position },
  });

  await revalidateWorkflowViews(projectKey, session.user.id, orgSlug);
  return serializeWorkflowStatus(row);
}

export async function deleteWorkflowStatus(
  projectId: string,
  statusKey: string,
  migrateToKey: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (statusKey === migrateToKey) {
    throw new Error("INVALID: Migrate target must differ from deleted status");
  }

  const { orgSlug, projectKey } = await requireStatusManager(
    projectId,
    session.user.id,
  );

  const count = await prisma.workflowStatus.count({ where: { projectId } });
  if (count <= 1) {
    throw new Error("INVALID: At least one status must remain");
  }

  const target = await assertValidProjectStatus(projectId, migrateToKey);
  const removing = await prisma.workflowStatus.findUnique({
    where: { projectId_key: { projectId, key: statusKey } },
  });
  if (!removing) throw new Error("NOT_FOUND: Status not found");

  await prisma.$transaction([
    prisma.issue.updateMany({
      where: { projectId, status: statusKey },
      data: { status: target.key },
    }),
    prisma.workflowStatus.delete({
      where: { id: removing.id },
    }),
  ]);

  await revalidateWorkflowViews(projectKey, session.user.id, orgSlug);
}
