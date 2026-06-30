import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { requireApiUser, withRateLimit } from "@/lib/api/auth";
import { handleApiError, jsonOk, jsonError } from "@/lib/api/response";
import { requireProjectAccess } from "@/lib/auth/rbac";
import { htmlToPlainText } from "@/lib/ai/plain-text";
import { requireGroqLanguageModel } from "@/lib/ai/require-groq";
import { issuePath } from "@/lib/projects/route";
import { rateLimit } from "@/lib/rate-limit";
import { recordAiUsageForProject } from "@/lib/billing/record-ai-usage";

function buildCommentThreadText(
  comments: {
    id: string;
    parentId: string | null;
    content: string;
    createdAt: Date;
    author: { name: string | null; email: string };
  }[],
): string {
  const byParent = new Map<string | null, typeof comments>();
  for (const c of comments) {
    const key = c.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }

  const lines: string[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const list = byParent.get(parentId) ?? [];
    for (const c of list) {
      const author = c.author.name?.trim() || c.author.email;
      const when = c.createdAt.toISOString().slice(0, 10);
      const text = htmlToPlainText(c.content).slice(0, 4000);
      lines.push(`${"  ".repeat(depth)}- [${when}] ${author}: ${text}`);
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    await withRateLimit(user.id!, "ai-issue-comments");
    const { success } = await rateLimit(`${user.id}:ai-issue-comments`, {
      requests: 35,
      window: "1 m",
    });
    if (!success) throw new Error("FORBIDDEN: Rate limit exceeded");

    const body = (await req.json()) as {
      issueId?: string;
      mode?: "summarize" | "draft_reply";
      hint?: string;
    };
    if (!body.issueId || !body.mode) {
      return jsonError("issueId and mode are required", 400);
    }

    const issue = await prisma.issue.findUnique({
      where: { id: body.issueId },
      select: {
        id: true,
        title: true,
        issueKey: true,
        projectId: true,
        project: { select: { key: true } },
      },
    });
    if (!issue) throw new Error("NOT_FOUND: Issue not found");

    await requireProjectAccess(user.id!, issue.projectId);
    await recordAiUsageForProject(issue.projectId);

    const comments = await prisma.comment.findMany({
      where: { issueId: body.issueId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        parentId: true,
        content: true,
        createdAt: true,
        author: { select: { name: true, email: true } },
      },
    });

    const thread = buildCommentThreadText(comments);
    const issueLink = issuePath(issue.project.key, issue.id);
    const model = requireGroqLanguageModel();

    if (body.mode === "summarize") {
      const { text } = await generateText({
        model,
        system:
          "You summarize issue discussion threads. Use only the provided thread. Output concise markdown: bullets for themes, decisions, and open questions. If the thread is empty, say so.",
        prompt: `Issue ${issue.issueKey}: ${issue.title}
Link: ${issueLink}

Thread:
${thread || "(no comments)"}`,
      });
      return jsonOk({ text });
    }

    const { text } = await generateText({
      model,
      system: `You draft a helpful reply as the logged-in teammate. Ground only in the thread and issue title. Do not invent facts. Output HTML suitable for a rich text editor (use <p>, <ul>, <li>, <strong>). Include a short greeting. The issue URL is ${issueLink}.`,
      prompt: `Issue ${issue.issueKey}: ${issue.title}

Thread:
${thread || "(no comments)"}

Optional focus from the author:
${body.hint?.trim() || "(none)"}`,
    });

    return jsonOk({ text });
  } catch (error) {
    return handleApiError(error);
  }
}
