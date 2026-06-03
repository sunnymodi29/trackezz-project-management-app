import { prisma } from "@/lib/db";
import type { OrganizationRole, ProjectRole } from "@/generated/prisma/client";

export async function getOrganizationMembership(
  userId: string,
  organizationId: string
) {
  return prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

export async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
}

export async function requireOrganizationMember(
  userId: string,
  organizationId: string
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { ownerId: true },
  });
  if (!org) throw new Error("NOT_FOUND: Organization not found");

  const member = await getOrganizationMembership(userId, organizationId);
  if (!member && org.ownerId !== userId) {
    throw new Error("FORBIDDEN: Not an organization member");
  }

  return {
    organization: org,
    member,
    isOwner: org.ownerId === userId,
    orgRole: member?.role ?? (org.ownerId === userId ? "owner" : null),
  };
}

/** Org invite project_admin with no project rows — access all projects in the org. */
export async function isOrgWideProjectAdmin(
  userId: string,
  organizationId: string,
  orgMember: { role: OrganizationRole } | null,
): Promise<boolean> {
  if (orgMember?.role !== "project_admin") return false;
  const projectCount = await prisma.projectMember.count({
    where: { userId, project: { organizationId } },
  });
  return projectCount === 0;
}

export async function requireProjectAccess(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true, organization: { select: { ownerId: true } } },
  });
  if (!project) throw new Error("NOT_FOUND: Project not found");

  const orgMember = await getOrganizationMembership(
    userId,
    project.organizationId,
  );
  const projectMember = await getProjectMembership(userId, projectId);
  const isOrgOwner = project.organization.ownerId === userId;
  const isOrgWideAdmin = await isOrgWideProjectAdmin(
    userId,
    project.organizationId,
    orgMember,
  );

  if (!isOrgOwner && !isOrgWideAdmin && !projectMember) {
    throw new Error("FORBIDDEN: No access to this project");
  }

  return {
    project,
    organizationId: project.organizationId,
    orgMember,
    isOrgOwner,
    isOrgProjectAdmin: isOrgWideAdmin,
    isOrgWideProjectAdmin: isOrgWideAdmin,
    projectMember,
  };
}

export function isOrgOwner(
  userId: string,
  organization: { ownerId: string }
): boolean {
  return organization.ownerId === userId;
}

export function canCreateProject(
  userId: string,
  organization: { ownerId: string },
  orgMember: { role: OrganizationRole } | null,
  isOrgWideProjectAdmin = false,
): boolean {
  if (isOrgOwner(userId, organization)) return true;
  return isOrgWideProjectAdmin;
}

export function canManageProject(
  userId: string,
  organization: { ownerId: string },
  orgMember: { role: OrganizationRole } | null,
  projectMember: { role: ProjectRole } | null,
  isOrgWideProjectAdmin = false,
): boolean {
  if (isOrgOwner(userId, organization)) return true;
  if (isOrgWideProjectAdmin) return true;
  return projectMember?.role === "project_admin";
}

export function canInviteToProject(
  userId: string,
  organization: { ownerId: string },
  orgMember: { role: OrganizationRole } | null,
  projectMember: { role: ProjectRole } | null,
  isOrgWideProjectAdmin = false,
): boolean {
  return canManageProject(
    userId,
    organization,
    orgMember,
    projectMember,
    isOrgWideProjectAdmin,
  );
}

export function canManageIssues(
  projectMember: { role: ProjectRole } | null,
  opts: {
    userId: string;
    organization: { ownerId: string };
    orgMember: { role: OrganizationRole } | null;
    isOrgWideProjectAdmin?: boolean;
  },
): boolean {
  if (isOrgOwner(opts.userId, opts.organization)) return true;
  if (opts.isOrgWideProjectAdmin) return true;
  if (!projectMember) return false;
  return (
    projectMember.role === "project_admin" || projectMember.role === "member"
  );
}

/** Owner, org member, or member of any project in the org. */
export async function userHasOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { ownerId: true },
  });
  if (!org) return false;
  if (org.ownerId === userId) return true;

  const member = await getOrganizationMembership(userId, organizationId);
  if (member) return true;

  const projectMember = await prisma.projectMember.findFirst({
    where: { userId, project: { organizationId } },
    select: { id: true },
  });
  return !!projectMember;
}

export async function getAccessibleProjectIds(
  userId: string,
  organizationId: string
): Promise<string[] | "all"> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { ownerId: true },
  });
  if (!org) return [];

  if (org.ownerId === userId) {
    const all = await prisma.project.findMany({
      where: { organizationId },
      select: { id: true },
    });
    return "all";
  }

  const orgMember = await getOrganizationMembership(userId, organizationId);
  if (await isOrgWideProjectAdmin(userId, organizationId, orgMember)) {
    return "all";
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId, project: { organizationId } },
    select: { projectId: true },
  });
  return memberships.map((m) => m.projectId);
}
