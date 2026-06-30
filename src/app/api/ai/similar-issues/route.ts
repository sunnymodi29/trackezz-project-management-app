import { requireApiUser, withRateLimit } from "@/lib/api/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";
import { requireProjectAccess } from "@/lib/auth/rbac";
import { findSimilarIssuesForProject } from "@/lib/ai/similar-issues";
import { rateLimit } from "@/lib/rate-limit";
import { recordAiUsageForProject } from "@/lib/billing/record-ai-usage";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    await withRateLimit(user.id!, "ai-similar-issues");
    const { success } = await rateLimit(`${user.id}:ai-similar-issues`, {
      requests: 45,
      window: "1 m",
    });
    if (!success) throw new Error("FORBIDDEN: Rate limit exceeded");

    const body = (await req.json()) as {
      projectId?: string;
      title?: string;
      description?: string | null;
      excludeIssueId?: string;
    };
    if (!body.projectId || !body.title?.trim()) {
      return jsonError("projectId and title are required", 400);
    }

    await requireProjectAccess(user.id!, body.projectId);
    await recordAiUsageForProject(body.projectId);

    const similar = await findSimilarIssuesForProject({
      projectId: body.projectId,
      title: body.title,
      description: body.description,
      excludeIssueId: body.excludeIssueId,
    });

    return jsonOk({ similar });
  } catch (error) {
    return handleApiError(error);
  }
}
