"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { serializeUser } from "@/lib/serializers";
import { invalidateBootstrapForUser } from "@/lib/org/cache";
import { clearWorkspaceCookies } from "@/lib/org/workspace-cookies";
import {
  UPLOAD_UNAVAILABLE_MESSAGE,
  deleteStoredFile,
  isUploadStorageAvailable,
  isVercelBlobUrl,
  storeAvatarFile,
} from "@/lib/storage";
import type { User } from "@/types";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

async function getUserOrgSlug(userId: string): Promise<string | undefined> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: { select: { slug: true } } },
  });
  if (membership) return membership.organization.slug;

  const owned = await prisma.organization.findFirst({
    where: { ownerId: userId },
    select: { slug: true },
  });
  return owned?.slug;
}

export async function updateUserProfile(input: {
  name: string;
}): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (name.length > 80) throw new Error("Name must be 80 characters or less");

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  const slug = await getUserOrgSlug(session.user.id);
  if (slug) await invalidateBootstrapForUser(session.user.id, slug);
  revalidatePath("/dashboard/settings");

  return serializeUser(user);
}

export async function uploadUserAvatar(formData: FormData): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose an image file");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Image must be 2MB or smaller");
  }
  const type = file.type || "application/octet-stream";
  if (!ALLOWED_AVATAR_TYPES.has(type)) {
    throw new Error("Use JPEG, PNG, GIF, or WebP");
  }

  if (!isUploadStorageAvailable()) {
    throw new Error(UPLOAD_UNAVAILABLE_MESSAGE);
  }

  const userId = session.user.id;
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true, image: true },
  });
  const oldUrl = existing?.avatarUrl ?? existing?.image;
  if (oldUrl && (isVercelBlobUrl(oldUrl) || oldUrl.startsWith("/uploads/"))) {
    await deleteStoredFile(oldUrl);
  }

  const stored = await storeAvatarFile(userId, file);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: stored.url, image: stored.url },
  });

  const slug = await getUserOrgSlug(userId);
  if (slug) await invalidateBootstrapForUser(userId, slug);
  revalidatePath("/dashboard/settings");

  return serializeUser(user);
}

export async function removeUserAvatar(): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true, image: true },
  });
  const oldUrl = existing?.avatarUrl ?? existing?.image;
  if (oldUrl && (isVercelBlobUrl(oldUrl) || oldUrl.startsWith("/uploads/"))) {
    await deleteStoredFile(oldUrl);
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null, image: null },
  });

  const slug = await getUserOrgSlug(session.user.id);
  if (slug) await invalidateBootstrapForUser(session.user.id, slug);
  revalidatePath("/dashboard/settings");

  return serializeUser(user);
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const newPassword = input.newPassword.trim();
  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    throw new Error("Password sign-in is not enabled for this account");
  }

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function pickIssueReporterFallback(
  tx: Tx,
  projectId: string,
  excludeUserId: string
): Promise<string> {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: {
      leadId: true,
      organization: { select: { ownerId: true } },
      members: { select: { userId: true, role: true } },
    },
  });
  if (!project) throw new Error("Project not found");

  if (project.leadId && project.leadId !== excludeUserId) {
    return project.leadId;
  }
  const projectAdmin = project.members.find(
    (m) => m.role === "project_admin" && m.userId !== excludeUserId
  );
  if (projectAdmin) return projectAdmin.userId;

  const anyMember = project.members.find((m) => m.userId !== excludeUserId);
  if (anyMember) return anyMember.userId;

  if (project.organization.ownerId !== excludeUserId) {
    return project.organization.ownerId;
  }

  throw new Error(
    "Cannot delete account: you are the only member on a project with issues. Transfer or delete the project first."
  );
}

export async function deleteUserAccount(input: {
  confirmEmail: string;
  password?: string;
}): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!user) throw new Error("NOT_FOUND");

  const confirmEmail = input.confirmEmail.trim().toLowerCase();
  if (confirmEmail !== user.email.toLowerCase()) {
    throw new Error("Email does not match your account");
  }

  if (user.passwordHash) {
    if (!input.password?.trim()) {
      throw new Error("Enter your password to confirm deletion");
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw new Error("Password is incorrect");
  }

  await prisma.$transaction(async (tx) => {
    const ownedOrgs = await tx.organization.findMany({
      where: { ownerId: userId },
      include: { members: true },
    });

    for (const org of ownedOrgs) {
      const others = org.members.filter((m) => m.userId !== userId);
      if (others.length === 0) {
        await tx.organization.delete({ where: { id: org.id } });
      } else {
        const successor =
          others.find((m) => m.role === "owner") ??
          others.find((m) => m.role === "project_admin") ??
          others[0];

        await tx.organization.update({
          where: { id: org.id },
          data: { ownerId: successor.userId },
        });
        await tx.organizationMember.update({
          where: {
            userId_organizationId: {
              userId: successor.userId,
              organizationId: org.id,
            },
          },
          data: { role: "owner" },
        });
      }
    }

    const reportedIssues = await tx.issue.findMany({
      where: { reporterId: userId },
      select: { id: true, projectId: true },
    });
    for (const issue of reportedIssues) {
      const fallback = await pickIssueReporterFallback(
        tx,
        issue.projectId,
        userId
      );
      await tx.issue.update({
        where: { id: issue.id },
        data: { reporterId: fallback },
      });
    }

    const attachments = await tx.attachment.findMany({
      where: { uploadedById: userId },
      select: { id: true, issue: { select: { projectId: true } } },
    });
    for (const attachment of attachments) {
      const fallback = await pickIssueReporterFallback(
        tx,
        attachment.issue.projectId,
        userId
      );
      await tx.attachment.update({
        where: { id: attachment.id },
        data: { uploadedById: fallback },
      });
    }

    await tx.comment.deleteMany({ where: { authorId: userId } });
    await tx.activityLog.deleteMany({ where: { userId } });
    await tx.auditLog.deleteMany({ where: { userId } });
    await tx.aIConversation.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { actorId: userId } });
    await tx.invitation.deleteMany({ where: { invitedById: userId } });
    await tx.project.updateMany({
      where: { leadId: userId },
      data: { leadId: null },
    });
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });

    await tx.user.delete({ where: { id: userId } });
  });

  await clearWorkspaceCookies();
}
