"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  requireOrganizationMember,
  canInviteToProject,
  canManageProject,
  isOrgOwner,
  isOrgWideProjectAdmin,
} from "@/lib/auth/rbac";
import { serializeInvitation } from "@/lib/serializers";
import { invalidateBootstrapForUser } from "@/lib/org/cache";
import {
  buildOrgAdminInviteEmail,
  buildProjectInviteEmail,
  sendBrevoEmailOrThrow,
} from "@/lib/email/brevo";
import { notifyInvitationReceived } from "@/lib/notifications/service";
import { getInvitationWorkspaceTargets } from "@/lib/invitations/workspace-path";
import { applyInvitationWorkspaceCookies } from "@/lib/org/workspace-cookies";
import { isRedirectError } from "@/lib/next/redirect-error";
import type { Invitation, ProjectRole } from "@/types";

const INVITE_TTL_DAYS = 7;

export type InvitationSendResult = {
  invitation: Invitation;
  inviteUrl: string;
  emailSent: true;
};

function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000"
  );
}

function inviteUrlForToken(token: string): string {
  return `${appOrigin()}/invite/${token}`;
}

function normalizeInvitationEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!email) throw new Error("Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  return email;
}

async function deliverInvitationEmail(
  invitationId: string,
  params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: { email: string; name?: string };
  },
): Promise<void> {
  try {
    await sendBrevoEmailOrThrow({
      to: params.to,
      subject: params.subject,
      htmlContent: params.html,
      textContent: params.text,
      replyTo: params.replyTo,
    });
  } catch (e) {
    await prisma.invitation
      .delete({ where: { id: invitationId } })
      .catch(() => {});
    throw e;
  }
}

/** Owner invites someone to create projects (org-level project_admin). */
export async function sendOrganizationProjectAdminInvitation(input: {
  organizationId: string;
  email: string;
}): Promise<InvitationSendResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });
  if (!org) throw new Error("NOT_FOUND");
  if (!isOrgOwner(session.user.id, org)) {
    throw new Error(
      "FORBIDDEN: Only the organization owner can invite project admins",
    );
  }

  const email = normalizeInvitationEmail(input.email);
  await validateNotDuplicateMember(email, input.organizationId);

  const inviter = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      organizationId: input.organizationId,
      organizationRole: "project_admin",
      invitedById: session.user.id,
      expiresAt,
    },
    include: { invitedBy: true },
  });

  const inviteUrl = inviteUrlForToken(invitation.token);
  const { subject, html, text } = buildOrgAdminInviteEmail({
    inviteUrl,
    organizationName: org.name,
    inviterName: inviter?.name ?? inviter?.email ?? "Owner",
  });
  await deliverInvitationEmail(invitation.id, {
    to: email,
    subject,
    html,
    text,
    replyTo: inviter?.email
      ? { email: inviter.email, name: inviter.name ?? undefined }
      : undefined,
  });

  await notifyInvitationReceived({
    invitationId: invitation.id,
    email,
    token: invitation.token,
    inviterId: session.user.id,
    organizationSlug: org.slug,
    organizationName: org.name,
    organizationRole: "project_admin",
  });

  await invalidateBootstrapForUser(session.user.id, org.slug);
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/inbox");
  return {
    invitation: serializeInvitation(invitation),
    inviteUrl,
    emailSent: true,
  };
}

/** Owner or project admin invites to a specific project. */
export async function sendProjectInvitation(input: {
  projectId: string;
  email: string;
  role: ProjectRole;
}): Promise<InvitationSendResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    include: { organization: true },
  });
  if (!project) throw new Error("NOT_FOUND");

  const orgCtx = await requireOrganizationMember(
    session.user.id,
    project.organizationId,
  );
  const projectMember = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: session.user.id, projectId: project.id },
    },
  });
  const isOrgWide = await isOrgWideProjectAdmin(
    session.user.id,
    project.organizationId,
    orgCtx.member,
  );

  if (
    !canInviteToProject(
      session.user.id,
      project.organization,
      orgCtx.member,
      projectMember,
      isOrgWide,
    )
  ) {
    throw new Error("FORBIDDEN: Cannot invite to this project");
  }

  const email = normalizeInvitationEmail(input.email);
  await validateNotDuplicateProjectMember(email, project.id);

  const inviter = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      projectId: project.id,
      projectRole: input.role,
      invitedById: session.user.id,
      expiresAt,
    },
    include: { invitedBy: true },
  });

  const inviteUrl = inviteUrlForToken(invitation.token);
  const { subject, html, text } = buildProjectInviteEmail({
    inviteUrl,
    projectName: project.name,
    organizationName: project.organization.name,
    inviterName: inviter?.name ?? "A teammate",
    role: input.role,
  });
  await deliverInvitationEmail(invitation.id, {
    to: email,
    subject,
    html,
    text,
    replyTo: inviter?.email
      ? { email: inviter.email, name: inviter.name ?? undefined }
      : undefined,
  });

  await notifyInvitationReceived({
    invitationId: invitation.id,
    email,
    token: invitation.token,
    inviterId: session.user.id,
    organizationSlug: project.organization.slug,
    organizationName: project.organization.name,
    projectName: project.name,
    projectRole: input.role,
  });

  await invalidateBootstrapForUser(session.user.id, project.organization.slug);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  return {
    invitation: serializeInvitation(invitation),
    inviteUrl,
    emailSent: true,
  };
}

/** Resend the invitation email for a pending invite. */
export async function resendInvitationEmail(
  invitationId: string,
): Promise<{ inviteUrl: string; emailSent: true }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      organization: true,
      project: { include: { organization: true } },
      invitedBy: true,
    },
  });
  if (!invitation) throw new Error("NOT_FOUND");
  if (invitation.status !== "pending") {
    throw new Error("Only pending invitations can be resent");
  }
  if (invitation.expiresAt < new Date()) {
    throw new Error("Invitation expired — send a new invitation");
  }

  if (invitation.organizationId && invitation.organization) {
    if (!isOrgOwner(session.user.id, invitation.organization)) {
      throw new Error("FORBIDDEN");
    }
  } else if (invitation.projectId && invitation.project) {
    const orgCtx = await requireOrganizationMember(
      session.user.id,
      invitation.project.organizationId,
    );
    const pm = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: invitation.projectId,
        },
      },
    });
    const isOrgWide = await isOrgWideProjectAdmin(
      session.user.id,
      invitation.project.organizationId,
      orgCtx.member,
    );
    if (
      !canManageProject(
        session.user.id,
        invitation.project.organization,
        orgCtx.member,
        pm,
        isOrgWide,
      )
    ) {
      throw new Error("FORBIDDEN");
    }
  } else {
    throw new Error("NOT_FOUND");
  }

  const inviteUrl = inviteUrlForToken(invitation.token);
  const inviterName =
    invitation.invitedBy.name ?? invitation.invitedBy.email ?? "A teammate";

  if (invitation.projectId && invitation.project && invitation.projectRole) {
    const { subject, html, text } = buildProjectInviteEmail({
      inviteUrl,
      projectName: invitation.project.name,
      organizationName: invitation.project.organization.name,
      inviterName,
      role: invitation.projectRole,
    });
    await sendBrevoEmailOrThrow({
      to: invitation.email,
      subject,
      htmlContent: html,
      textContent: text,
      replyTo: invitation.invitedBy.email
        ? {
            email: invitation.invitedBy.email,
            name: invitation.invitedBy.name ?? undefined,
          }
        : undefined,
    });
  } else if (
    invitation.organizationId &&
    invitation.organization &&
    invitation.organizationRole
  ) {
    const { subject, html, text } = buildOrgAdminInviteEmail({
      inviteUrl,
      organizationName: invitation.organization.name,
      inviterName,
    });
    await sendBrevoEmailOrThrow({
      to: invitation.email,
      subject,
      htmlContent: html,
      textContent: text,
      replyTo: invitation.invitedBy.email
        ? {
            email: invitation.invitedBy.email,
            name: invitation.invitedBy.name ?? undefined,
          }
        : undefined,
    });
  } else {
    throw new Error("Invalid invitation");
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { inviteUrl, emailSent: true };
}

async function validateNotDuplicateMember(
  email: string,
  organizationId: string,
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: user.id, organizationId },
      },
    });
    if (member) throw new Error("User is already in this organization");
  }
}

async function validateNotDuplicateProjectMember(
  email: string,
  projectId: string,
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: user.id, projectId } },
    });
    if (member) throw new Error("User is already on this project");
  }
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { project: { include: { organization: true } } },
  });
  if (!invitation) throw new Error("NOT_FOUND");

  if (invitation.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: invitation.organizationId },
    });
    if (!org || !isOrgOwner(session.user.id, org)) {
      throw new Error("FORBIDDEN");
    }
  } else if (invitation.projectId && invitation.project) {
    const orgCtx = await requireOrganizationMember(
      session.user.id,
      invitation.project.organizationId,
    );
    const pm = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: invitation.projectId,
        },
      },
    });
    const isOrgWide = await isOrgWideProjectAdmin(
      session.user.id,
      invitation.project.organizationId,
      orgCtx.member,
    );
    if (
      !canManageProject(
        session.user.id,
        invitation.project.organization,
        orgCtx.member,
        pm,
        isOrgWide,
      )
    ) {
      throw new Error("FORBIDDEN");
    }
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "expired" },
  });
  revalidatePath("/dashboard/settings");
}

export type InvitationInviteState = "pending" | "accepted" | "expired";

function classifyInvitationState(invitation: {
  status: string;
  expiresAt: Date;
}): InvitationInviteState {
  if (invitation.status === "accepted") return "accepted";
  if (invitation.status === "expired" || invitation.expiresAt < new Date()) {
    return "expired";
  }
  return "pending";
}

export async function getInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: true,
      project: { include: { organization: true } },
      invitedBy: true,
    },
  });
  if (!invitation) return null;

  return {
    ...invitation,
    inviteState: classifyInvitationState(invitation),
  };
}

export type AcceptInviteState = { error?: string } | null;

/** Form action: accept invite, set cookies, redirect to dashboard (reliable in production). */
export async function acceptInvitationAction(
  token: string,
  _prev: AcceptInviteState,
  _formData: FormData,
): Promise<AcceptInviteState> {
  try {
    const { projectKey } = await acceptInvitation(token);
    if (projectKey) {
      redirect(`/dashboard/projects/${projectKey}`);
    }
    redirect("/dashboard");
    return null;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Failed to accept invitation";
    return { error: message };
  }
}

export async function acceptInvitation(token: string): Promise<{
  organizationSlug: string;
  projectKey?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: true,
      project: { include: { organization: true } },
    },
  });
  if (!invitation) throw new Error("NOT_FOUND");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (
    !user?.email ||
    user.email.toLowerCase() !== invitation.email.toLowerCase()
  ) {
    throw new Error("Sign in with the invited email address");
  }

  if (invitation.status === "accepted") {
    const targets = getInvitationWorkspaceTargets(invitation);
    await applyInvitationWorkspaceCookies(
      targets.organizationSlug,
      targets.projectKey,
    );
    await invalidateBootstrapForUser(session.user.id, targets.organizationSlug);
    return targets;
  }

  if (invitation.status !== "pending") throw new Error("Invitation invalid");
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
    });
    throw new Error("Invitation expired");
  }

  let organizationSlug = "";
  let projectKey: string | undefined;

  await prisma.$transaction(async (tx) => {
    if (invitation.organizationId && invitation.organizationRole) {
      await tx.organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: session.user!.id!,
            organizationId: invitation.organizationId,
          },
        },
        create: {
          userId: session.user!.id!,
          organizationId: invitation.organizationId,
          role: invitation.organizationRole,
        },
        update: { role: invitation.organizationRole },
      });
      organizationSlug = invitation.organization!.slug;
    }

    if (invitation.projectId && invitation.projectRole) {
      const project = invitation.project!;
      await tx.projectMember.upsert({
        where: {
          userId_projectId: {
            userId: session.user!.id!,
            projectId: invitation.projectId,
          },
        },
        create: {
          userId: session.user!.id!,
          projectId: invitation.projectId,
          role: invitation.projectRole,
        },
        update: { role: invitation.projectRole },
      });

      const orgId = invitation.organizationId ?? project.organizationId;
      const orgRoleFromInvite =
        invitation.organizationId && invitation.organizationRole;
      if (orgId && !orgRoleFromInvite) {
        await tx.organizationMember.upsert({
          where: {
            userId_organizationId: {
              userId: session.user!.id!,
              organizationId: orgId,
            },
          },
          create: {
            userId: session.user!.id!,
            organizationId: orgId,
            role: "project_admin",
          },
          update: {},
        });
      }

      organizationSlug = project.organization.slug;
      projectKey = project.key;
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });
  });

  if (!organizationSlug) {
    throw new Error(
      "Invitation could not be applied — missing organization. Contact the person who invited you.",
    );
  }

  await applyInvitationWorkspaceCookies(organizationSlug, projectKey);

  await invalidateBootstrapForUser(session.user.id, organizationSlug);
  if (invitation.invitedById !== session.user.id) {
    await invalidateBootstrapForUser(invitation.invitedById, organizationSlug);
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");

  return { organizationSlug, projectKey };
}
