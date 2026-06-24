import { z } from "zod";
import { prisma } from "@/lib/db";
import { issueInclude } from "@/lib/queries/issues";
import { serializeIssue } from "@/lib/serializers";
import { assertValidProjectStatus } from "@/lib/projects/workflow-status.server";
import { requireApiUser, withRateLimit } from "@/lib/api/auth";
import { requireProjectAccess } from "@/lib/auth/rbac";
import { handleApiError, jsonOk } from "@/lib/api/response";
const patchSchema = z.object({
  status: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(500).optional(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const user = await requireApiUser(_request);
    const { issueId } = await params;
    await withRateLimit(user.id!, `issue:${issueId}`);

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: issueInclude,
    });

    if (!issue) {
      return handleApiError(new Error("NOT_FOUND: Issue not found"));
    }

    await requireProjectAccess(user.id!, issue.projectId);
    return jsonOk(serializeIssue(issue));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const user = await requireApiUser(request);
    const { issueId } = await params;
    await withRateLimit(user.id!, `issue:patch:${issueId}`);

    const existing = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true },
    });

    if (!existing) {
      return handleApiError(new Error("NOT_FOUND: Issue not found"));
    }

    await requireProjectAccess(user.id!, existing.projectId);

    const body = patchSchema.parse(await request.json());

    if (body.status) {
      await assertValidProjectStatus(existing.projectId, body.status);
    }

    const issue = await prisma.issue.update({
      where: { id: issueId },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.priority && { priority: body.priority }),
        ...(body.status && { status: body.status }),
      },
      include: issueInclude,
    });

    return jsonOk(serializeIssue(issue));
  } catch (error) {
    return handleApiError(error);
  }
}
