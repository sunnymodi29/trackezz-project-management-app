import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { userHasOrganizationAccess } from "@/lib/auth/rbac";
import { ACTIVE_ORG_COOKIE } from "@/lib/org/cookies";

/** Default org when no active-org cookie is set (matches bootstrap). */
export async function resolveOrganizationForUser(userId: string) {
  const owned = await prisma.organization.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });
  if (owned) return owned;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });
  if (membership) return membership.organization;

  const projectOnly = await prisma.projectMember.findFirst({
    where: { userId },
    include: { project: { include: { organization: true } } },
    orderBy: { createdAt: "desc" },
  });
  return projectOnly?.project.organization ?? null;
}

/** Active org slug: cookie first, then membership/ownership fallback. */
export async function resolveActiveOrganizationSlug(
  userId: string,
  organizationSlug?: string | null,
): Promise<string | null> {
  const cookieStore = await cookies();
  const orgSlugFromCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value?.trim();
  const effectiveOrgSlug = organizationSlug ?? orgSlugFromCookie ?? null;

  if (effectiveOrgSlug) {
    const org = await prisma.organization.findUnique({
      where: { slug: effectiveOrgSlug },
      select: { id: true, slug: true },
    });
    if (org && (await userHasOrganizationAccess(userId, org.id))) {
      return org.slug;
    }
  }

  const fallback = await resolveOrganizationForUser(userId);
  return fallback?.slug ?? null;
}
