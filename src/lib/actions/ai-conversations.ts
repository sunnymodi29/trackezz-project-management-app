"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireProjectAccess } from "@/lib/auth/rbac";
import type { UIMessage } from "ai";
import {
  ASSISTANT_UI_MESSAGE_PREFIX,
  uiMessagesToStoredRows,
} from "@/lib/ai/ui-message-text";

export async function listAiConversations(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await requireProjectAccess(session.user.id, projectId);

  return prisma.aIConversation.findMany({
    where: { projectId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
    take: 40,
  });
}

export async function createAiConversation(projectId: string, title?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await requireProjectAccess(session.user.id, projectId);

  return prisma.aIConversation.create({
    data: {
      projectId,
      userId: session.user.id,
      title: title?.trim() || "New chat",
    },
    select: { id: true, title: true, createdAt: true },
  });
}

export async function loadAiConversationMessages(
  conversationId: string,
): Promise<UIMessage[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const conv = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    select: { id: true },
  });
  if (!conv) throw new Error("NOT_FOUND: Conversation not found");

  const rows = await prisma.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true },
  });

  return rows.map((r) => {
    if (
      r.role === "assistant" &&
      r.content.startsWith(ASSISTANT_UI_MESSAGE_PREFIX)
    ) {
      try {
        const raw = JSON.parse(
          r.content.slice(ASSISTANT_UI_MESSAGE_PREFIX.length),
        ) as { parts?: UIMessage["parts"] };
        if (Array.isArray(raw.parts) && raw.parts.length > 0) {
          return {
            id: r.id,
            role: r.role as "assistant",
            parts: raw.parts,
          };
        }
      } catch {
        /* fall through to plain text */
      }
    }
    return {
      id: r.id,
      role: r.role,
      parts: [{ type: "text" as const, text: r.content }],
    };
  });
}

export async function renameAiConversation(conversationId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const t = title.trim();
  if (!t) throw new Error("FORBIDDEN: Title cannot be empty");
  if (t.length > 200) throw new Error("FORBIDDEN: Title is too long (max 200 characters)");

  const conv = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    select: { id: true, projectId: true },
  });
  if (!conv) throw new Error("NOT_FOUND: Conversation not found");

  await requireProjectAccess(session.user.id, conv.projectId);

  await prisma.aIConversation.update({
    where: { id: conversationId },
    data: { title: t },
  });
}

export async function deleteAiConversation(conversationId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const conv = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    select: { id: true },
  });
  if (!conv) throw new Error("NOT_FOUND: Conversation not found");

  await prisma.aIConversation.delete({ where: { id: conversationId } });
}

/** Replace stored messages (same shape as project-chat onFinish). Used after Apply/Reject/supersede so UI state survives reload. */
export async function saveAiConversationSnapshot(
  conversationId: string,
  messages: UIMessage[],
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const conv = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    select: { id: true, projectId: true },
  });
  if (!conv) throw new Error("NOT_FOUND: Conversation not found");

  await requireProjectAccess(session.user.id, conv.projectId);

  const rows = uiMessagesToStoredRows(messages).slice(-60);

  await prisma.$transaction(async (tx) => {
    await tx.aIMessage.deleteMany({ where: { conversationId } });
    if (rows.length > 0) {
      await tx.aIMessage.createMany({
        data: rows.map((r) => ({
          conversationId,
          role: r.role,
          content: r.content,
        })),
      });
    }
  });
}
