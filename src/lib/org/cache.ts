import { cacheDel } from "@/lib/redis";
import { prisma } from "@/lib/db";

export async function invalidateBootstrapForUser(
  userId: string,
  organizationSlug?: string
): Promise<void> {
  if (organizationSlug) {
    await cacheDel(`bootstrap:${userId}:${organizationSlug}`);
    return;
  }
  // Best-effort: common pattern; without slug list we rely on short TTL
  await cacheDel(`bootstrap:${userId}:default`);
}

/** Clear cached bootstrap for every member of an org (e.g. after billing changes). */
export async function invalidateBootstrapForOrganization(
  organizationId: string,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      slug: true,
      ownerId: true,
      members: { select: { userId: true } },
    },
  });
  if (!org) return;

  const userIds = new Set([org.ownerId, ...org.members.map((m) => m.userId)]);
  await Promise.all(
    [...userIds].map((userId) =>
      invalidateBootstrapForUser(userId, org.slug),
    ),
  );
}
