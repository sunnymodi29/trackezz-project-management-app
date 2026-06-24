import { getBootstrapData } from "@/lib/queries/bootstrap";
import { requireApiUser, withRateLimit } from "@/lib/api/auth";
import { handleApiError, jsonOk } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    await withRateLimit(user.id!, "projects");

    const { searchParams } = new URL(request.url);
    const organizationSlug = searchParams.get("organization") ?? undefined;

    const data = await getBootstrapData(organizationSlug ?? null, user.id!);
    if (!data.hasWorkspace) {
      return Response.json({ error: "No workspace access" }, { status: 403 });
    }

    return jsonOk(data.projects);
  } catch (error) {
    return handleApiError(error);
  }
}
