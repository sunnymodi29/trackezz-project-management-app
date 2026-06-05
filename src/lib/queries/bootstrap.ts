import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  canCreateProject,
  getAccessibleProjectIds,
  hasProjectAdminRoleInOrg,
  isOrgOwner,
  isOrgWideProjectAdmin,
  userHasOrganizationAccess,
} from "@/lib/auth/rbac";
import { cacheGet, cacheSet } from "@/lib/redis";
import {
  serializeUser,
  serializeOrganization,
  serializeOrganizationMember,
  serializeProject,
  serializeProjectMember,
  serializeSprint,
  serializeEpic,
  serializeNotification,
  serializeActivityLog,
  serializeInvitation,
  serializeAIConversation,
} from "@/lib/serializers";
import { getIssues, issueInclude } from "@/lib/queries/issues";
import { ACTIVE_ORG_COOKIE, ACTIVE_PROJECT_COOKIE } from "@/lib/org/cookies";
import type {
  User,
  Organization,
  OrganizationMember,
  Project,
  ProjectMember,
  Issue,
  Sprint,
  Epic,
  Label,
  Notification,
  ActivityLog,
  Invitation,
  AIConversation,
  UserPermissions,
} from "@/types";

export interface BootstrapData {
  hasWorkspace: boolean;
  currentUser: User;
  organization: Organization | null;
  organizationMembers: OrganizationMember[];
  permissions: UserPermissions;
  projects: Project[];
  projectMembers: ProjectMember[];
  issues: Issue[];
  sprints: Sprint[];
  epics: Epic[];
  labels: Label[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  invitations: Invitation[];
  aiConversations: AIConversation[];
}

export type WorkspaceBootstrapData = BootstrapData & {
  hasWorkspace: true;
  organization: Organization;
};

const emptyPermissions: UserPermissions = {
  isOrgOwner: false,
  isOrgProjectAdmin: false,
  canCreateProject: false,
  canInviteOrgProjectAdmin: false,
};

async function buildNoWorkspaceBootstrap(
  userId: string,
): Promise<BootstrapData> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!currentUser) throw new Error("User not found");

  const notifications = await prisma.notification.findMany({
    where: { userId: currentUser.id },
    include: {
      actor: true,
      issue: { include: issueInclude },
      invitation: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    hasWorkspace: false,
    currentUser: serializeUser(currentUser),
    organization: null,
    organizationMembers: [],
    permissions: emptyPermissions,
    projects: [],
    projectMembers: [],
    issues: [],
    sprints: [],
    epics: [],
    labels: [],
    notifications: notifications.map(serializeNotification),
    activityLogs: [],
    invitations: [],
    aiConversations: [],
  };
}

/** Redirects to /dashboard when the user has no org/project access. */
export async function requireWorkspaceBootstrap(
  organizationSlug?: string | null,
  userId?: string,
): Promise<WorkspaceBootstrapData> {
  const data = await getBootstrapData(organizationSlug, userId);
  if (!data.hasWorkspace || !data.organization) {
    redirect("/dashboard");
  }
  return {
    ...data,
    hasWorkspace: true as const,
    organization: data.organization,
  };
}

/**
 * Default org when no active-org cookie is set.
 * Owners always land on their own org first; invite-only users use membership/project access.
 */
async function resolveOrganizationForUser(userId: string) {
  const owned = await prisma.organization.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });
  if (owned) return owned;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });
  if (membership) return membership.organization;

  const projectOnly = await prisma.projectMember.findFirst({
    where: { userId },
    include: { project: { include: { organization: true } } },
    orderBy: { createdAt: "desc" },
  });
  return projectOnly?.project.organization ?? null;
}

export async function getBootstrapData(
  organizationSlug?: string | null,
  userId?: string
): Promise<BootstrapData> {
  const session = await auth();
  const resolvedUserId = userId ?? session?.user?.id;
  if (!resolvedUserId) throw new Error("Unauthorized");

  const cookieStore = await cookies();
  const orgSlugFromCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const effectiveOrgSlug = organizationSlug ?? orgSlugFromCookie ?? null;

  let org = effectiveOrgSlug
    ? await prisma.organization.findUnique({ where: { slug: effectiveOrgSlug } })
    : null;

  if (org && !(await userHasOrganizationAccess(resolvedUserId, org.id))) {
    org = null;
  }

  if (!org) {
    org = await resolveOrganizationForUser(resolvedUserId);
  }
  if (!org) {
    return buildNoWorkspaceBootstrap(resolvedUserId);
  }

  const cacheKey = `bootstrap:${resolvedUserId}:${org.slug}`;
  let cached: BootstrapData | null = null;
  try {
    cached = await cacheGet<BootstrapData>(cacheKey);
  } catch {
    cached = null;
  }
  if (cached) return cached;

  const currentUser = await prisma.user.findUnique({
    where: { id: resolvedUserId },
  });
  if (!currentUser) throw new Error("User not found");

  const orgMember = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: resolvedUserId,
        organizationId: org.id,
      },
    },
    include: { user: true },
  });

  const hasOrgAccess = await userHasOrganizationAccess(resolvedUserId, org.id);
  if (!hasOrgAccess) {
    throw new Error("FORBIDDEN: Not a member of this organization");
  }

  const accessible = await getAccessibleProjectIds(resolvedUserId, org.id);
  const projectWhere =
    accessible === "all"
      ? { organizationId: org.id }
      : { organizationId: org.id, id: { in: accessible } };

  const projectIds =
    accessible === "all"
      ? (
          await prisma.project.findMany({
            where: { organizationId: org.id },
            select: { id: true },
          })
        ).map((p) => p.id)
      : accessible;

  const projectKeyCookie = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;
  let activeProject = projectKeyCookie
    ? await prisma.project.findFirst({
        where: {
          organizationId: org.id,
          key: projectKeyCookie,
          ...(accessible !== "all" ? { id: { in: accessible } } : {}),
        },
      })
    : null;

  if (!activeProject && projectIds.length > 0) {
    activeProject = await prisma.project.findFirst({
      where: { id: projectIds[0] },
    });
  }

  const [
    orgMembers,
    projects,
    projectMembers,
    issues,
    sprints,
    epics,
    labels,
    notifications,
    activityLogs,
    invitations,
    aiConversations,
  ] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: org.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.project.findMany({
      where: projectWhere,
      include: {
        lead: true,
        _count: { select: { issues: true, members: true } },
      },
      orderBy: { name: "asc" },
    }),
    projectIds.length > 0
      ? prisma.projectMember.findMany({
          where: { projectId: { in: projectIds } },
          include: { user: true },
        })
      : Promise.resolve([]),
    projectIds.length > 0
      ? getIssues(org.id, projectIds)
      : Promise.resolve([]),
    projectIds.length > 0
      ? prisma.sprint.findMany({
          where: { projectId: { in: projectIds } },
          include: {
            _count: { select: { issues: true } },
            issues: { select: { status: true } },
          },
          orderBy: { startDate: "asc" },
        })
      : Promise.resolve([]),
    projectIds.length > 0
      ? prisma.epic.findMany({
          where: { projectId: { in: projectIds } },
          include: { issues: { select: { status: true } } },
        })
      : Promise.resolve([]),
    projectIds.length > 0
      ? prisma.label.findMany({ where: { projectId: { in: projectIds } } })
      : Promise.resolve([]),
    prisma.notification.findMany({
      where: { userId: currentUser.id },
      include: {
        actor: true,
        issue: { include: issueInclude },
        invitation: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    projectIds.length > 0
      ? prisma.activityLog.findMany({
          where: { projectId: { in: projectIds } },
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    projectIds.length > 0
      ? prisma.invitation.findMany({
          where: {
            OR: [
              { organizationId: org.id, status: "pending" },
              { projectId: { in: projectIds }, status: "pending" },
            ],
          },
          include: { invitedBy: true },
        })
      : prisma.invitation.findMany({
          where: { organizationId: org.id, status: "pending" },
          include: { invitedBy: true },
        }),
    projectIds.length > 0
      ? prisma.aIConversation.findMany({
          where: { projectId: { in: projectIds } },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : Promise.resolve([]),
  ]);

  const owner = isOrgOwner(resolvedUserId, org);
  const isOrgWide = await isOrgWideProjectAdmin(
    resolvedUserId,
    org.id,
    orgMember,
  );
  const isProjectAdminInOrg =
    !owner && !isOrgWide
      ? await hasProjectAdminRoleInOrg(resolvedUserId, org.id)
      : false;
  const permissions: UserPermissions = {
    isOrgOwner: owner,
    isOrgProjectAdmin: isOrgWide,
    canCreateProject: canCreateProject(
      resolvedUserId,
      org,
      orgMember,
      isOrgWide,
      isProjectAdminInOrg,
    ),
    canInviteOrgProjectAdmin: owner,
  };

  const serializedProjects = projects.map((p) => serializeProject(p));

  if (activeProject && !serializedProjects.some((p) => p.id === activeProject!.id)) {
    activeProject = null;
  }

  const result: BootstrapData = {
    hasWorkspace: true,
    currentUser: serializeUser(currentUser),
    organization: serializeOrganization(org),
    organizationMembers: orgMembers.map(serializeOrganizationMember),
    permissions,
    projects: serializedProjects,
    projectMembers: projectMembers.map(serializeProjectMember),
    issues,
    sprints: sprints.map(serializeSprint),
    epics: epics.map(serializeEpic),
    labels: labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      projectId: l.projectId,
    })),
    notifications: notifications.map(serializeNotification),
    activityLogs: activityLogs.map(serializeActivityLog),
    invitations: invitations.map((inv) => serializeInvitation(inv)),
    aiConversations: aiConversations.map(serializeAIConversation),
  };

  await cacheSet(cacheKey, result, 120);
  return result;
}

export async function getAnalyticsData() {
  const { computeOrgAnalytics, toLegacyAnalytics } = await import(
    "@/lib/analytics/compute"
  );
  const data = await getBootstrapData();
  return toLegacyAnalytics(computeOrgAnalytics(data));
}
