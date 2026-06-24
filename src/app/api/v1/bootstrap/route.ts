import { getBootstrapData } from "@/lib/queries/bootstrap";
import { requireApiUser, withRateLimit } from "@/lib/api/auth";
import { handleApiError, jsonOk } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    await withRateLimit(user.id!, "bootstrap");

    const { searchParams } = new URL(request.url);
    const organization = searchParams.get("organization") ?? undefined;

    const data = await getBootstrapData(organization, user.id);
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}
