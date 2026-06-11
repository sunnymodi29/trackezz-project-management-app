"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { invalidateBootstrapForUser } from "@/lib/org/cache";
import { requireProjectAccess, canManageIssues } from "@/lib/auth/rbac";
import { issueInclude } from "@/lib/queries/issues";
import { serializeIssue } from "@/lib/serializers";
import { notifyIssueComment } from "@/lib/notifications/service";
import {
  UPLOAD_UNAVAILABLE_MESSAGE,
  isUploadStorageAvailable,
  storeUploadedFile,
} from "@/lib/storage";
import type { Issue } from "@/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

async function revalidateIssueViews(
  projectKey: string,
  userId: string,
  orgSlug: string,
  issueId?: string
) {
  await invalidateBootstrapForUser(userId, orgSlug);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-tasks");
  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/projects/${projectKey}`);
  if (issueId) {
    revalidatePath(`/dashboard/projects/${projectKey}/issues/${issueId}`);
  }
}

async function logCommentActivity(
  userId: string,
  issueId: string,
  projectId: string,
  organizationId: string,
  action: string,
  details: string
) {
  await prisma.activityLog.create({
    data: {
      action,
      details,
      userId,
      issueId,
      projectId,
      organizationId,
    },
  });
}

async function fetchSerializedIssue(issueId: string): Promise<Issue> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: issueInclude,
  });
  if (!issue) throw new Error("NOT_FOUND: Issue not found");
  return serializeIssue(issue);
}

async function assertCanComment(userId: string, issueId: string) {
  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      issueKey: true,
      projectId: true,
      project: {
        select: {
          key: true,
          organizationId: true,
          organization: { select: { slug: true, ownerId: true } },
        },
      },
    },
  });
  if (!existing) throw new Error("NOT_FOUND: Issue not found");

  const access = await requireProjectAccess(userId, existing.projectId);
  const org = existing.project.organization;

  if (
    !canManageIssues(access.projectMember, {
      userId,
      organization: org,
      orgMember: access.orgMember,
      isOrgWideProjectAdmin: access.isOrgWideProjectAdmin,
    })
  ) {
    throw new Error("FORBIDDEN: Cannot comment on issues in this project");
  }

  return existing;
}

function buildCommentContent(
  text: string,
  file?: { name: string; url: string; type: string }
): string {
  const trimmed = text.trim();
  if (!file) return trimmed;

  const attachmentLine = file.type.startsWith("image/")
    ? `![${file.name}](${file.url})`
    : `📎 [${file.name}](${file.url})`;

  return trimmed ? `${attachmentLine}\n\n${trimmed}` : attachmentLine;
}

async function saveIssueUpload(
  issueId: string,
  file: File,
  uploadedById: string
): Promise<{ name: string; url: string; type: string; size: number }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File too large (max 10MB)");
  }

  if (!isUploadStorageAvailable()) {
    throw new Error(UPLOAD_UNAVAILABLE_MESSAGE);
  }

  const stored = await storeUploadedFile({
    file,
    keyPrefix: `issues/${issueId}`,
  });

  await prisma.attachment.create({
    data: {
      name: file.name,
      url: stored.url,
      storagePath: stored.storagePath,
      size: stored.size,
      type: stored.type,
      issueId,
      uploadedById,
    },
  });

  return {
    name: file.name,
    url: stored.url,
    type: stored.type,
    size: stored.size,
  };
}

export async function addIssueComment(
  issueId: string,
  content: string,
  options?: { parentId?: string }
): Promise<Issue> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await assertCanComment(session.user.id, issueId);
  const finalContent = buildCommentContent(content);
  if (!finalContent) throw new Error("Comment cannot be empty");

  if (options?.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: options.parentId, issueId },
    });
    if (!parent) throw new Error("NOT_FOUND: Parent comment not found");
  }

  await prisma.comment.create({
    data: {
      content: finalContent,
      authorId: session.user.id,
      issueId,
      parentId: options?.parentId,
    },
  });

  await logCommentActivity(
    session.user.id,
    issueId,
    existing.projectId,
    existing.project.organizationId,
    options?.parentId ? "replied" : "commented",
    `${existing.issueKey}: ${options?.parentId ? "replied to a comment" : "added a comment"}`
  );

  const issueMeta = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      title: true,
      reporterId: true,
      assignees: { select: { userId: true } },
    },
  });
  if (issueMeta) {
    const recipientIds = [
      issueMeta.reporterId,
      ...issueMeta.assignees.map((a) => a.userId),
    ];
    await notifyIssueComment({
      issueId,
      issueKey: existing.issueKey,
      issueTitle: issueMeta.title,
      recipientIds,
      actorId: session.user.id,
      organizationSlug: existing.project.organization.slug,
      isReply: Boolean(options?.parentId),
    });
  }

  await revalidateIssueViews(
    existing.project.key,
    session.user.id,
    existing.project.organization.slug,
    issueId
  );
  return fetchSerializedIssue(issueId);
}

export async function addIssueCommentWithUpload(
  formData: FormData
): Promise<Issue> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const issueId = String(formData.get("issueId") ?? "");
  const content = String(formData.get("content") ?? "");
  const parentIdRaw = formData.get("parentId");
  const parentId = parentIdRaw ? String(parentIdRaw) : undefined;
  const file = formData.get("file");

  if (!issueId) throw new Error("Missing issueId");

  const existing = await assertCanComment(session.user.id, issueId);

  let uploaded: { name: string; url: string; type: string } | undefined;
  if (file instanceof File && file.size > 0) {
    uploaded = await saveIssueUpload(issueId, file, session.user.id);
  }

  const finalContent = buildCommentContent(content, uploaded);
  if (!finalContent) throw new Error("Comment cannot be empty");

  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, issueId },
    });
    if (!parent) throw new Error("NOT_FOUND: Parent comment not found");
  }

  await prisma.comment.create({
    data: {
      content: finalContent,
      authorId: session.user.id,
      issueId,
      parentId,
    },
  });

  await logCommentActivity(
    session.user.id,
    issueId,
    existing.projectId,
    existing.project.organizationId,
    "commented",
    `${existing.issueKey}: added a comment${uploaded ? " with attachment" : ""}`
  );

  const issueMeta = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      title: true,
      reporterId: true,
      assignees: { select: { userId: true } },
    },
  });
  if (issueMeta) {
    await notifyIssueComment({
      issueId,
      issueKey: existing.issueKey,
      issueTitle: issueMeta.title,
      recipientIds: [
        issueMeta.reporterId,
        ...issueMeta.assignees.map((a) => a.userId),
      ],
      actorId: session.user.id,
      organizationSlug: existing.project.organization.slug,
      isReply: Boolean(parentId),
    });
  }

  await revalidateIssueViews(
    existing.project.key,
    session.user.id,
    existing.project.organization.slug,
    issueId
  );
  return fetchSerializedIssue(issueId);
}

export async function toggleCommentReaction(
  commentId: string,
  emoji: string
): Promise<Issue> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const normalizedEmoji = emoji.trim();
  if (!normalizedEmoji) throw new Error("Invalid emoji");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      issueId: true,
      issue: {
        select: {
          projectId: true,
          project: {
        select: {
          key: true,
          organizationId: true,
          organization: { select: { slug: true, ownerId: true } },
        },
      },
        },
      },
    },
  });
  if (!comment) throw new Error("NOT_FOUND: Comment not found");

  await assertCanComment(session.user.id, comment.issueId);

  const existing = await prisma.reaction.findUnique({
    where: {
      commentId_userId_emoji: {
        commentId,
        userId: session.user.id,
        emoji: normalizedEmoji,
      },
    },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({
      data: {
        commentId,
        userId: session.user.id,
        emoji: normalizedEmoji,
      },
    });
  }

  await revalidateIssueViews(
    comment.issue.project.key,
    session.user.id,
    comment.issue.project.organization.slug,
    comment.issueId
  );
  return fetchSerializedIssue(comment.issueId);
}

async function deleteCommentTree(commentId: string) {
  const children = await prisma.comment.findMany({
    where: { parentId: commentId },
    select: { id: true },
  });
  for (const child of children) {
    await deleteCommentTree(child.id);
  }
  await prisma.reaction.deleteMany({ where: { commentId } });
  await prisma.comment.delete({ where: { id: commentId } });
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<Issue> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Comment cannot be empty");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      issueId: true,
      issue: {
        select: {
          issueKey: true,
          projectId: true,
          project: {
        select: {
          key: true,
          organizationId: true,
          organization: { select: { slug: true, ownerId: true } },
        },
      },
        },
      },
    },
  });
  if (!comment) throw new Error("NOT_FOUND: Comment not found");
  if (comment.authorId !== session.user.id) {
    throw new Error("FORBIDDEN: Only the author can edit this comment");
  }

  await assertCanComment(session.user.id, comment.issueId);

  await prisma.comment.update({
    where: { id: commentId },
    data: { content: trimmed },
  });

  await logCommentActivity(
    session.user.id,
    comment.issueId,
    comment.issue.projectId,
    comment.issue.project.organizationId,
    "edited comment",
    `${comment.issue.issueKey}: updated a comment`
  );

  await revalidateIssueViews(
    comment.issue.project.key,
    session.user.id,
    comment.issue.project.organization.slug,
    comment.issueId
  );
  return fetchSerializedIssue(comment.issueId);
}

export async function deleteComment(commentId: string): Promise<Issue> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      issueId: true,
      issue: {
        select: {
          issueKey: true,
          projectId: true,
          project: {
        select: {
          key: true,
          organizationId: true,
          organization: { select: { slug: true, ownerId: true } },
        },
      },
        },
      },
    },
  });
  if (!comment) throw new Error("NOT_FOUND: Comment not found");
  if (comment.authorId !== session.user.id) {
    throw new Error("FORBIDDEN: Only the author can delete this comment");
  }

  await assertCanComment(session.user.id, comment.issueId);
  await deleteCommentTree(commentId);

  await logCommentActivity(
    session.user.id,
    comment.issueId,
    comment.issue.projectId,
    comment.issue.project.organizationId,
    "deleted comment",
    `${comment.issue.issueKey}: deleted a comment`
  );

  await revalidateIssueViews(
    comment.issue.project.key,
    session.user.id,
    comment.issue.project.organization.slug,
    comment.issueId
  );
  return fetchSerializedIssue(comment.issueId);
}
