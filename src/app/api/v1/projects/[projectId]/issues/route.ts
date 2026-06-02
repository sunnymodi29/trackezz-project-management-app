import { z } from "zod";
import { getBootstrapData } from "@/lib/queries/bootstrap";
import { getIssuesByProject } from "@/lib/queries/issues";
import { resolveProjectIdFromRouteParam } from "@/lib/queries/projects";
import { requireApiUser, withRateLimit } from "@/lib/api/auth";
import { requireProjectAccess } from "@/lib/auth/rbac";
import { createIssue } from "@/lib/actions/issues";
import { handleApiError, jsonOk } from "@/lib/api/response";
import type { IssueStatus, IssueType, Priority } from "@/types";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.enum(["task", "bug", "feature", "improvement", "epic", "story"]),
  status: z.enum(["backlog", "todo", "in-progress", "in-review", "done", "cancelled"]),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]),
  estimate: z.number().int().positive().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireApiUser();
    const { projectId: projectKey } = await params;
    const data = await getBootstrapData();
    if (!data.organization) {
      return Response.json({ error: "No workspace access" }, { status: 403 });
    }
    const projectId = await resolveProjectIdFromRouteParam(
      projectKey,
      data.organization.id,
    );
    await withRateLimit(user.id!, `issues:${projectId}`);

    await requireProjectAccess(user.id!, projectId);
    const issues = await getIssuesByProject(projectId);
    return jsonOk(issues);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireApiUser();
    const { projectId: projectKey } = await params;
    const data = await getBootstrapData();
    if (!data.organization) {
      return Response.json({ error: "No workspace access" }, { status: 403 });
    }
    const projectId = await resolveProjectIdFromRouteParam(
      projectKey,
      data.organization.id,
    );
    await withRateLimit(user.id!, `issues:create:${projectId}`);

    const body = createSchema.parse(await request.json());
    const issue = await createIssue({
      projectId,
      title: body.title,
      description: body.description,
      type: body.type as IssueType,
      status: body.status as IssueStatus,
      priority: body.priority as Priority,
      estimate: body.estimate,
      assigneeIds: body.assigneeIds,
      reporterId: user.id!,
    });

    return jsonOk(issue, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
