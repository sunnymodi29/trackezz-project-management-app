import { prisma } from "@/lib/db";

function slugifyBase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function uniqueOrgSlug(base: string): Promise<string> {
  let slug = base || "org";
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const exists = await prisma.organization.findUnique({
      where: { slug: candidate },
    });
    if (!exists) return candidate;
    n += 1;
  }
}

export interface ProvisionAccountResult {
  organizationId: string;
  organizationSlug: string;
}

/** New signup: one organization, user is owner (buyer). */
export async function provisionOrganizationForUser(
  userId: string,
  displayName: string,
  companyName?: string
): Promise<ProvisionAccountResult> {
  const orgName = companyName?.trim() || `${displayName}'s Company`;
  const orgSlug = await uniqueOrgSlug(slugifyBase(orgName));

  const organization = await prisma.organization.create({
    data: {
      name: orgName,
      slug: orgSlug,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "owner",
        },
      },
      subscription: {
        create: {
          plan: "free",
          status: "active",
        },
      },
    },
  });

  return {
    organizationId: organization.id,
    organizationSlug: organization.slug,
  };
}
