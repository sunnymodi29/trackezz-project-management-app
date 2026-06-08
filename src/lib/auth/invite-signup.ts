import { prisma } from "@/lib/db";

export async function hasPendingInviteForEmail(
  email: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const invitation = await prisma.invitation.findFirst({
    where: {
      email: normalized,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return !!invitation;
}
