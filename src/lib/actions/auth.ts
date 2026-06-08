"use server";

import { prisma } from "@/lib/db";
import { hasPendingInviteForEmail } from "@/lib/auth/invite-signup";
import { hashPassword } from "@/lib/auth/password";
import { provisionOrganizationForUser } from "@/lib/organizations/setup";
import {
  clearWorkspaceCookies,
  setActiveOrganizationCookies,
} from "@/lib/org/workspace-cookies";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  inviteToken: z.string().min(1).optional(),
});

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      passwordHash,
      image: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
    },
  });

  let organizationSlug: string | undefined;
  const skipPersonalOrg =
    (data.inviteToken
      ? await shouldSkipPersonalOrgOnRegister(email, data.inviteToken)
      : false) || (await hasPendingInviteForEmail(email));

  if (!skipPersonalOrg) {
    const provisioned = await provisionOrganizationForUser(user.id, data.name);
    organizationSlug = provisioned.organizationSlug;
  }

  await clearWorkspaceCookies();
  if (organizationSlug) {
    await setActiveOrganizationCookies(organizationSlug);
  }

  return { success: true, userId: user.id, organizationSlug };
}

async function shouldSkipPersonalOrgOnRegister(
  email: string,
  inviteToken?: string,
): Promise<boolean> {
  if (!inviteToken) return false;

  const invitation = await prisma.invitation.findUnique({
    where: { token: inviteToken },
  });
  if (!invitation) return false;
  if (invitation.status !== "pending") return false;
  if (invitation.expiresAt < new Date()) return false;
  return invitation.email.toLowerCase() === email;
}
