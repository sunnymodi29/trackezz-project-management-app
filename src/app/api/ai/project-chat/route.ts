import {
  convertToModelMessages,
  streamText,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { prisma } from "@/lib/db";
import { requireApiUser, withRateLimit } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/response";
import { requireProjectAccess } from "@/lib/auth/rbac";
import { buildProjectIssueCatalogText } from "@/lib/ai/project-grounding";
import { requireGroqLanguageModel } from "@/lib/ai/require-groq";
import {
  textFromUiMessageParts,
  uiMessagesToStoredRows,
} from "@/lib/ai/ui-message-text";
import { rateLimit } from "@/lib/rate-limit";

/** Titles we replace with the first user message (ChatGPT-style). */
const PLACEHOLDER_CHAT_TITLES = new Set(["New chat", "Project assistant"]);

export async function POST(req: Request) {
  try {
    const user = await requireApiUser();
    await withRateLimit(user.id!, "ai-project-chat");
    const { success } = await rateLimit(`${user.id}:ai-project-chat`, {
      requests: 40,
      window: "1 m",
    });
    if (!success) throw new Error("FORBIDDEN: Rate limit exceeded");

    const body = (await req.json()) as {
      id?: string;
      messages?: unknown;
      projectId?: string;
    };

    if (!body.id || !body.projectId) {
      return new Response("Missing id or projectId", { status: 400 });
    }

    await requireProjectAccess(user.id!, body.projectId);

    const messages = (await validateUIMessages({
      messages: body.messages,
    })) as UIMessage[];

    const model = requireGroqLanguageModel();
    const catalog = await buildProjectIssueCatalogText(body.projectId);

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { key: true, name: true },
    });
    if (!project) throw new Error("NOT_FOUND: Project not found");

    const existingConv = await prisma.aIConversation.findUnique({
      where: { id: body.id },
      select: { userId: true, projectId: true },
    });
    if (existingConv) {
      if (
        existingConv.userId !== user.id ||
        existingConv.projectId !== body.projectId
      ) {
        return new Response("Forbidden", { status: 403 });
      }
    } else {
      await prisma.aIConversation.create({
        data: {
          id: body.id,
          title: "New chat",
          projectId: body.projectId,
          userId: user.id!,
        },
      });
    }

    const basePath = `/dashboard/projects/${encodeURIComponent(project.key)}/issues`;

    const system = `You are the TrackEzz project assistant for project "${project.name}" (key ${project.key}).

Rules:
- Ground every factual claim in the issue catalog below. If information is missing, say you do not know.
- When referencing an issue, cite its exact issue key and include a markdown link using the id from the catalog:
  [ISSUEKEY](${basePath}/ISSUE_ID)
  Replace ISSUEKEY and ISSUE_ID with values from the catalog line (id=...).
- Do not invent issue keys or ids that are not listed.
- Prefer short, actionable answers with bullet lists when helpful.

Issue catalog (most recently updated first):
${catalog}`;

    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ messages: latest }) => {
        const rows = uiMessagesToStoredRows(latest).slice(-60);
        const convId = body.id!;
        const firstUser = latest.find((m) => m.role === "user");
        const firstText = firstUser ? textFromUiMessageParts(firstUser) : "";
        const derivedTitle =
          firstText.length > 72 ? `${firstText.slice(0, 72)}…` : firstText;

        await prisma.$transaction(async (tx) => {
          await tx.aIMessage.deleteMany({ where: { conversationId: convId } });
          if (rows.length > 0) {
            await tx.aIMessage.createMany({
              data: rows.map((r) => ({
                conversationId: convId,
                role: r.role,
                content: r.content,
              })),
            });
          }

          if (firstText && derivedTitle) {
            const conv = await tx.aIConversation.findUnique({
              where: { id: convId },
              select: { title: true },
            });
            if (conv && PLACEHOLDER_CHAT_TITLES.has(conv.title)) {
              await tx.aIConversation.update({
                where: { id: convId },
                data: { title: derivedTitle },
              });
            }
          }
        });
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
