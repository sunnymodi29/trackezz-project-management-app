import { prisma } from "@/lib/db";
import { requireSessionUser, withRateLimit } from "@/lib/api/auth";
import { handleApiError, jsonOk } from "@/lib/api/response";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { tokenId } = await params;
    await withRateLimit(user.id!, `tokens:revoke:${tokenId}`);

    const row = await prisma.personalAccessToken.findFirst({
      where: { id: tokenId, userId: user.id! },
      select: { id: true },
    });
    if (!row) {
      return handleApiError(new Error("NOT_FOUND: Token not found"));
    }

    await prisma.personalAccessToken.delete({ where: { id: tokenId } });
    return jsonOk({ revoked: true });
  } catch (error) {
    return handleApiError(error);
  }
}
