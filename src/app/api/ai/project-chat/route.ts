import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser, withRateLimit } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/response";
import { requireProjectAccess } from "@/lib/auth/rbac";
import {
  buildProjectIssueCatalogText,
  buildWorkflowStatusKeysCatalogText,
  formatProjectWorkspaceContextText,
  loadProjectWorkspaceForAssistant,
} from "@/lib/ai/project-grounding";
import { requireGroqLanguageModel } from "@/lib/ai/require-groq";
import { validateIssueStatusChangeProposal } from "@/lib/ai/issue-status-proposal";
import { proposeIssueStatusChangeOutputSchema } from "@/lib/ai/propose-issue-status-tool-schema";
import {
  textFromUiMessageParts,
  uiMessagesToStoredRows,
} from "@/lib/ai/ui-message-text";
import { rateLimit } from "@/lib/rate-limit";
import { recordAiUsageForProject } from "@/lib/billing/record-ai-usage";

/** Titles we replace with the first user message (ChatGPT-style). */
const PLACEHOLDER_CHAT_TITLES = new Set(["New chat", "Project assistant"]);

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
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

    const conversationId = body.id;
    const projectId = body.projectId;

    await requireProjectAccess(user.id!, projectId);
    await recordAiUsageForProject(projectId);

    const projectAssistantTools = {
      proposeIssueStatusChange: tool({
        description:
          "Propose changing an issue's workflow status. The user must confirm in the chat UI before the change is saved. Use the issue id from the issue catalog (id=...). For toStatus, use the exact key= value from the workflow list (hyphenated, e.g. in-progress — never use underscores like in_progress).",
        inputSchema: z.object({
          issueId: z.string().trim().min(1),
          toStatus: z.string().trim().min(1),
          reason: z.string().max(500),
        }),
        outputSchema: proposeIssueStatusChangeOutputSchema,
        execute: async (input) =>
          validateIssueStatusChangeProposal(user.id!, projectId, input),
      }),
    };

    const messages = (await validateUIMessages({
      messages: body.messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK validateUIMessages tools typing is stricter than our tool() instance
      tools: projectAssistantTools as any,
    })) as UIMessage[];

    const model = requireGroqLanguageModel();
    const [projectWorkspace, catalog, workflowKeysText] = await Promise.all([
      loadProjectWorkspaceForAssistant(projectId),
      buildProjectIssueCatalogText(projectId),
      buildWorkflowStatusKeysCatalogText(projectId),
    ]);
    if (!projectWorkspace) throw new Error("NOT_FOUND: Project not found");
    const workspaceContextText =
      formatProjectWorkspaceContextText(projectWorkspace);

    const existingConv = await prisma.aIConversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, projectId: true },
    });
    if (existingConv) {
      if (
        existingConv.userId !== user.id ||
        existingConv.projectId !== projectId
      ) {
        return new Response("Forbidden", { status: 403 });
      }
    } else {
      await prisma.aIConversation.create({
        data: {
          id: conversationId,
          title: "New chat",
          projectId,
          userId: user.id!,
        },
      });
    }

    const basePath = `/dashboard/projects/${encodeURIComponent(projectWorkspace.key)}/issues`;

    const system = `You are the TrackEzz project assistant for project "${projectWorkspace.name}" (key ${projectWorkspace.key}).

Rules:
- Ground every factual claim only in the sections below (project workspace, issue catalog, workflow). If something is not listed there, say you do not know rather than guessing.
- Lists may be truncated (e.g. capped issue count); say so if the user asks for exhaustive data.
- When referencing an issue, cite its exact issue key and include a markdown link using the id from the catalog:
  [ISSUEKEY](${basePath}/ISSUE_ID)
  Replace ISSUEKEY and ISSUE_ID with values from the catalog line (id=...).
- Do not invent issue keys, issue ids, member names, labels, sprint names, or epic names that are not shown below.
- Prefer short, actionable answers with bullet lists when helpful.
- When the user wants to change an issue's workflow status (move, transition, close, mark done, etc.), call proposeIssueStatusChange with the catalog issue id, the target status key from the workflow list below (key=...), and a brief reason. The status is not updated until the user confirms the inline proposal in chat.

Project workspace (members, labels, sprints, epics — no private emails):
${workspaceContextText}

Issue catalog (most recently updated first; each line: key, id, status, type, priority, title, optional short description preview after " | "):
${catalog}

${workflowKeysText}`;

    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(messages),
      tools: projectAssistantTools,
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ messages: latest }) => {
        const rows = uiMessagesToStoredRows(latest).slice(-60);
        const firstUser = latest.find((m) => m.role === "user");
        const firstText = firstUser ? textFromUiMessageParts(firstUser) : "";
        const derivedTitle =
          firstText.length > 72 ? `${firstText.slice(0, 72)}…` : firstText;

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

          if (firstText && derivedTitle) {
            const conv = await tx.aIConversation.findUnique({
              where: { id: conversationId },
              select: { title: true },
            });
            if (conv && PLACEHOLDER_CHAT_TITLES.has(conv.title)) {
              await tx.aIConversation.update({
                where: { id: conversationId },
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
