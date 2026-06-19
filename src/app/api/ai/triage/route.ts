import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser, withRateLimit } from "@/lib/api/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";
import { requireProjectAccess } from "@/lib/auth/rbac";
import { htmlToPlainText } from "@/lib/ai/plain-text";
import { requireGroqLanguageModel } from "@/lib/ai/require-groq";
import { rateLimit } from "@/lib/rate-limit";

const issueTypeSchema = z.enum([
  "task",
  "bug",
  "feature",
  "improvement",
  "epic",
  "story",
]);

const prioritySchema = z.enum(["urgent", "high", "medium", "low", "none"]);

const triageSchema = z.object({
  type: issueTypeSchema,
  status: z.string(),
  priority: prioritySchema,
  rationale: z.string().max(900),
});

export async function POST(req: Request) {
  try {
    const user = await requireApiUser();
    await withRateLimit(user.id!, "ai-triage");
    const { success } = await rateLimit(`${user.id}:ai-triage`, {
      requests: 30,
      window: "1 m",
    });
    if (!success) throw new Error("FORBIDDEN: Rate limit exceeded");

    const body = (await req.json()) as {
      projectId?: string;
      title?: string;
      description?: string | null;
    };
    if (!body.projectId || !body.title?.trim()) {
      return jsonError("projectId and title are required", 400);
    }

    await requireProjectAccess(user.id!, body.projectId);

    const statuses = await prisma.workflowStatus.findMany({
      where: { projectId: body.projectId },
      select: { key: true, label: true },
      orderBy: { position: "asc" },
    });
    if (statuses.length === 0) {
      throw new Error("NOT_FOUND: No workflow statuses for project");
    }

    const model = requireGroqLanguageModel();
    const statusLines = statuses.map((s) => `- ${s.key} (${s.label})`).join("\n");
    const desc = htmlToPlainText(body.description ?? "").slice(0, 6000);

    const { object } = await generateObject({
      model,
      schema: triageSchema,
      prompt: `You triage issues for a software project. Suggest type, workflow status, and priority.

Allowed workflow status keys (pick exactly one key from this list):
${statusLines}

Issue types: task, bug, feature, improvement, epic, story.

Title:
${body.title.trim()}

Description (plain text):
${desc || "(none)"}

Return JSON only matching the schema. The status field must be exactly one of the allowed keys.`,
    });

    const allowed = new Set(statuses.map((s) => s.key));
    const status = allowed.has(object.status)
      ? object.status
      : statuses[0]!.key;

    return jsonOk({
      suggestion: {
        type: object.type,
        status,
        priority: object.priority,
        rationale: object.rationale,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
