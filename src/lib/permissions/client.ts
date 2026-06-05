import type { BootstrapData } from "@/lib/queries/bootstrap";

/** Project settings, members, invites — not issue editing. */
export function canManageProject(
  data: Pick<BootstrapData, "permissions" | "projectMembers" | "currentUser">,
  projectId: string,
): boolean {
  const { permissions, projectMembers, currentUser } = data;
  if (permissions.isOrgOwner || permissions.isOrgProjectAdmin) return true;
  const member = projectMembers.find(
    (m) => m.projectId === projectId && m.userId === currentUser.id,
  );
  return member?.role === "project_admin";
}

export function canManageProjectIssues(
  data: Pick<BootstrapData, "permissions" | "projectMembers" | "currentUser">,
  projectId: string
): boolean {
  const { permissions, projectMembers, currentUser } = data;
  if (permissions.isOrgOwner || permissions.isOrgProjectAdmin) return true;
  const member = projectMembers.find(
    (m) => m.projectId === projectId && m.userId === currentUser.id
  );
  return member?.role === "project_admin" || member?.role === "member";
}
