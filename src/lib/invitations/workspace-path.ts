export function getInvitationWorkspaceTargets(invitation: {
  organization: { slug: string } | null;
  project: { key: string; organization: { slug: string } } | null;
}): { organizationSlug: string; projectKey?: string } {
  if (invitation.project) {
    return {
      organizationSlug: invitation.project.organization.slug,
      projectKey: invitation.project.key,
    };
  }
  if (invitation.organization) {
    return { organizationSlug: invitation.organization.slug };
  }
  throw new Error("Invitation has no organization or project");
}

export function invitationDashboardPath(projectKey?: string): string {
  return projectKey
    ? `/dashboard/projects/${projectKey}/board`
    : "/dashboard";
}
