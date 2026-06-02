import { auth } from "@/auth";
import { resolveSessionEmail } from "@/lib/auth/session-email";
import {
  acceptInvitation,
  getInvitationByToken,
} from "@/lib/actions/invitations";
import {
  getInvitationWorkspaceTargets,
  invitationDashboardPath,
} from "@/lib/invitations/workspace-path";
import { userHasOrganizationAccess } from "@/lib/auth/rbac";
import { applyInvitationWorkspaceCookies } from "@/lib/org/workspace-cookies";
import { invalidateBootstrapForUser } from "@/lib/org/cache";

/**
 * Accept or resume an invite, set workspace cookies, return dashboard path.
 * Call from Route Handlers only (cookie writes).
 */
export async function runInviteJoinFlow(token: string): Promise<string> {
  const session = await auth();
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return `/invite/${token}`;
  }

  const inviteEmail = invitation.email.trim().toLowerCase();

  if (!session?.user?.id) {
    return `/register?email=${encodeURIComponent(inviteEmail)}&invite=${encodeURIComponent(token)}`;
  }

  const sessionEmail = await resolveSessionEmail(session);
  if (!sessionEmail || sessionEmail !== inviteEmail) {
    return `/invite/${token}`;
  }

  const organizationId =
    invitation.project?.organizationId ?? invitation.organizationId;

  if (invitation.inviteState === "expired") {
    return `/invite/${token}`;
  }

  if (invitation.inviteState === "accepted") {
    if (!organizationId) return "/dashboard";
    const hasAccess = await userHasOrganizationAccess(
      session.user.id,
      organizationId,
    );
    if (!hasAccess) return "/dashboard";

    const { organizationSlug, projectKey } =
      getInvitationWorkspaceTargets(invitation);
    await applyInvitationWorkspaceCookies(organizationSlug, projectKey);
    await invalidateBootstrapForUser(session.user.id, organizationSlug);
    return invitationDashboardPath(projectKey);
  }

  try {
    const { organizationSlug, projectKey } = await acceptInvitation(token);
    return invitationDashboardPath(projectKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("Invitation invalid") ||
      message.includes("NOT_FOUND")
    ) {
      if (organizationId) {
        const hasAccess = await userHasOrganizationAccess(
          session.user.id,
          organizationId,
        );
        if (hasAccess) {
          const { organizationSlug, projectKey } =
            getInvitationWorkspaceTargets(invitation);
          await applyInvitationWorkspaceCookies(organizationSlug, projectKey);
          await invalidateBootstrapForUser(session.user.id, organizationSlug);
          return invitationDashboardPath(projectKey);
        }
      }
      return "/dashboard";
    }
    return `/invite/${token}`;
  }
}
