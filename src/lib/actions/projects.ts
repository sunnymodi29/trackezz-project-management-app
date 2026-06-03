"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  requireOrganizationMember,
  requireProjectAccess,
  canCreateProject,
  canManageProject,
  isOrgWideProjectAdmin,
  userHasOrganizationAccess,
} from "@/lib/auth/rbac";
import {
  serializeProject,
  serializeProjectMember,
  toDbProjectRole,
} from "@/lib/serializers";
import { invalidateBootstrapForUser } from "@/lib/org/cache";
import {
  deriveProjectKey,
  projectIconFromName,
  randomProjectColor,
} from "@/lib/projects/project-utils";
import type { Project, ProjectMember, ProjectRole } from "@/types";

async function invalidateOrg(userId: string, organizationSlug: string, projectKey?: string) {
  await invalidateBootstrapForUser(userId, organizationSlug);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  if (projectKey) {
    revalidatePath(`/dashboard/projects/${projectKey}`);
    revalidatePath(`/dashboard/projects/${projectKey}/settings`);
  }
}

async function uniqueProjectKey(organizationId: string, baseKey: string): Promise<string> {
  let key = baseKey.slice(0, 10).toUpperCase();
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? key : `${key.slice(0, 8)}${suffix}`;
    const existing = await prisma.project.findUnique({
      where: { organizationId_key: { organizationId, key: candidate } },
    });
    if (!existing) return candidate;
    suffix += 1;
  }
}

export interface CreateProjectInput {
  organizationId: string;
  name: string;
  description?: string;
  key?: string;
  members?: { userId: string; role: ProjectRole }[];
}

export interface CreateProjectResult {
  project: Project;
  members: ProjectMember[];
}

export async function createProject(
  input: CreateProjectInput
): Promise<CreateProjectResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });
  if (!org) throw new Error("NOT_FOUND");

  const { member } = await requireOrganizationMember(
    session.user.id,
    input.organizationId
  );
  const isOrgWide = await isOrgWideProjectAdmin(
    session.user.id,
    input.organizationId,
    member,
  );
  if (!canCreateProject(session.user.id, org, member, isOrgWide)) {
    throw new Error("FORBIDDEN: Cannot create projects");
  }

  const name = input.name.trim();
  if (!name) throw new Error("Project name is required");

  const baseKey = (input.key?.trim() || deriveProjectKey(name)).toUpperCase();
  const key = await uniqueProjectKey(input.organizationId, baseKey);
  const color = randomProjectColor();
  const icon = projectIconFromName(name);

  const memberRows: { userId: string; role: ReturnType<typeof toDbProjectRole> }[] = [];
  const seen = new Set<string>();
  const add = (userId: string, role: ProjectRole) => {
    if (seen.has(userId)) return;
    seen.add(userId);
    memberRows.push({ userId, role: toDbProjectRole(role) });
  };

  add(session.user.id, "project_admin");
  add(org.ownerId, "project_admin");
  for (const m of input.members ?? []) {
    const allowed = await userHasOrganizationAccess(
      m.userId,
      input.organizationId,
    );
    if (!allowed) {
      throw new Error(
        "Each member must belong to the organization or an existing project in it",
      );
    }
    add(m.userId, m.role);
  }

  const project = await prisma.project.create({
    data: {
      name,
      key,
      description: input.description?.trim() || null,
      color,
      icon,
      organizationId: input.organizationId,
      leadId: session.user.id,
      members: { create: memberRows },
    },
    include: {
      lead: true,
      _count: { select: { issues: true, members: true } },
    },
  });

  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    include: { user: true },
  });

  await invalidateOrg(session.user.id, org.slug);
  return {
    project: serializeProject(project),
    members: members.map(serializeProjectMember),
  };
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  key?: string;
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const access = await requireProjectAccess(session.user.id, projectId);
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
  });
  if (!org) throw new Error("NOT_FOUND");

  if (
    !canManageProject(
      session.user.id,
      org,
      access.orgMember,
      access.projectMember,
      access.isOrgWideProjectAdmin,
    )
  ) {
    throw new Error("FORBIDDEN");
  }

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { key: true, organizationId: true },
  });
  if (!existing) throw new Error("NOT_FOUND");

  let key = existing.key;
  if (input.key?.trim()) {
    const next = input.key.trim().toUpperCase();
    if (next !== existing.key) {
      const clash = await prisma.project.findUnique({
        where: {
          organizationId_key: {
            organizationId: existing.organizationId,
            key: next,
          },
        },
      });
      if (clash && clash.id !== projectId) {
        throw new Error("Project key already exists");
      }
      key = next;
    }
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: input.name?.trim(),
      description:
        input.description !== undefined
          ? input.description.trim() || null
          : undefined,
      key,
      ...(input.name ? { icon: projectIconFromName(input.name) } : {}),
    },
    include: {
      lead: true,
      _count: { select: { issues: true, members: true } },
    },
  });

  await invalidateOrg(session.user.id, org.slug, project.key);
  return serializeProject(project);
}

export async function deleteProject(projectId: string): Promise<{ projectKey: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const access = await requireProjectAccess(session.user.id, projectId);
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
  });
  if (!org) throw new Error("NOT_FOUND");

  if (
    !canManageProject(
      session.user.id,
      org,
      access.orgMember,
      access.projectMember,
      access.isOrgWideProjectAdmin,
    )
  ) {
    throw new Error("FORBIDDEN");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { key: true },
  });
  if (!project) throw new Error("NOT_FOUND");

  await prisma.project.delete({ where: { id: projectId } });
  await invalidateOrg(session.user.id, org.slug, project.key);
  return { projectKey: project.key };
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectRole
): Promise<ProjectMember> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const access = await requireProjectAccess(session.user.id, projectId);
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
  });
  if (!org) throw new Error("NOT_FOUND");

  if (
    !canManageProject(
      session.user.id,
      org,
      access.orgMember,
      access.projectMember,
      access.isOrgWideProjectAdmin,
    )
  ) {
    throw new Error("FORBIDDEN");
  }

  const existingProjectMember = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  // New members must be org members (or the org owner). Project-only invitees
  // can already be on the project — role changes skip this check.
  if (!existingProjectMember) {
    const orgMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: access.organizationId },
      },
    });
    if (!orgMember && org.ownerId !== userId) {
      throw new Error("User must belong to the organization first");
    }
  }

  const member = await prisma.projectMember.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId, role: toDbProjectRole(role) },
    update: { role: toDbProjectRole(role) },
    include: { user: true },
  });

  await invalidateOrg(session.user.id, org.slug);
  return serializeProjectMember(member);
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole
): Promise<ProjectMember> {
  return addProjectMember(projectId, userId, role);
}

export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const access = await requireProjectAccess(session.user.id, projectId);
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
  });
  if (!org) throw new Error("NOT_FOUND");

  if (
    !canManageProject(
      session.user.id,
      org,
      access.orgMember,
      access.projectMember,
      access.isOrgWideProjectAdmin,
    )
  ) {
    throw new Error("FORBIDDEN");
  }

  const adminCount = await prisma.projectMember.count({
    where: { projectId, role: "project_admin" },
  });
  const target = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (!target) throw new Error("NOT_FOUND");
  if (target.role === "project_admin" && adminCount <= 1) {
    throw new Error("Cannot remove the last project admin");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { key: true },
  });

  await prisma.projectMember.delete({
    where: { userId_projectId: { userId, projectId } },
  });

  const remainingProjects = await prisma.projectMember.count({
    where: { userId, project: { organizationId: org.id } },
  });
  if (remainingProjects === 0) {
    const targetOrgMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: org.id },
      },
    });
    if (targetOrgMember?.role === "project_admin") {
      await prisma.organizationMember.delete({
        where: {
          userId_organizationId: { userId, organizationId: org.id },
        },
      });
    }
  }

  await invalidateOrg(session.user.id, org.slug, project?.key);
  await invalidateBootstrapForUser(userId, org.slug);
}
