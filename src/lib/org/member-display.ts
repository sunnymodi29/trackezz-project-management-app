import type {
  Organization,
  OrganizationMember,
  Project,
  ProjectMember,
  User,
} from "@/types";

export type AssignableOrgUser = {
  userId: string;
  user: User;
};

/** Org `project_admin` with ≥1 project row — not org-wide; label as project access in UI. */
export function isProjectScopedOrgMember(
  userId: string,
  orgMember: Pick<OrganizationMember, "role" | "userId">,
  projectMembers: Pick<ProjectMember, "userId" | "projectId">[],
  projects: Pick<Project, "id">[],
): boolean {
  if (orgMember.role !== "project_admin" || orgMember.userId !== userId) {
    return false;
  }
  const projectIds = new Set(projects.map((p) => p.id));
  return projectMembers.some(
    (pm) => pm.userId === userId && projectIds.has(pm.projectId),
  );
}

export function orgMemberRoleLabel(
  member: OrganizationMember,
  projectMembers: ProjectMember[],
  projects: Project[],
): string {
  if (member.role === "owner") return "Owner";
  if (
    isProjectScopedOrgMember(
      member.userId,
      member,
      projectMembers,
      projects,
    )
  ) {
    return "Project access";
  }
  return member.role === "project_admin" ? "Project admin" : member.role;
}

export type ProjectOnlyCollaborator = {
  userId: string;
  user: ProjectMember["user"];
  projectNames: string[];
  roles: Set<string>;
};

/** Users with project membership in this org but no OrganizationMember row. */
export function getProjectOnlyCollaborators(
  organizationMembers: OrganizationMember[],
  projectMembers: ProjectMember[],
  projects: Project[],
): ProjectOnlyCollaborator[] {
  const orgUserIds = new Set(organizationMembers.map((m) => m.userId));
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const byUser = new Map<string, ProjectOnlyCollaborator>();

  for (const pm of projectMembers) {
    const project = projectById.get(pm.projectId);
    if (!project || orgUserIds.has(pm.userId)) continue;

    let entry = byUser.get(pm.userId);
    if (!entry) {
      entry = {
        userId: pm.userId,
        user: pm.user,
        projectNames: [],
        roles: new Set(),
      };
      byUser.set(pm.userId, entry);
    }
    if (!entry.projectNames.includes(project.name)) {
      entry.projectNames.push(project.name);
    }
    entry.roles.add(pm.role.replace("_", " "));
  }

  return Array.from(byUser.values()).sort((a, b) =>
    a.user.name.localeCompare(b.user.name),
  );
}

/** Everyone in the org who can be added to a new project (org members, owner, project collaborators). */
export function getAssignableOrgUsers(
  organization: Pick<Organization, "ownerId"> | null,
  organizationMembers: OrganizationMember[],
  projectMembers: ProjectMember[],
  projects: Project[],
  currentUser: User,
): AssignableOrgUser[] {
  const byId = new Map<string, AssignableOrgUser>();

  const add = (userId: string, user: User) => {
    if (!byId.has(userId)) byId.set(userId, { userId, user });
  };

  for (const m of organizationMembers) {
    add(m.userId, m.user);
  }

  for (const c of getProjectOnlyCollaborators(
    organizationMembers,
    projectMembers,
    projects,
  )) {
    add(c.userId, c.user);
  }

  if (organization?.ownerId && !byId.has(organization.ownerId)) {
    if (organization.ownerId === currentUser.id) {
      add(currentUser.id, currentUser);
    } else {
      const fromProject = projectMembers.find(
        (pm) => pm.userId === organization.ownerId,
      );
      if (fromProject) add(fromProject.userId, fromProject.user);
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.user.name.localeCompare(b.user.name),
  );
}
