"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireProjectAccess, userHasOrganizationAccess } from "@/lib/auth/rbac";
import { invalidateBootstrapForUser } from "@/lib/org/cache";
import {
  applyInvitationWorkspaceCookies,
  clearWorkspaceCookies,
  reconcileWorkspaceCookies,
  setActiveOrganizationCookies,
  setOrganizationCookie,
  setProjectCookie,
} from "@/lib/org/workspace-cookies";

export {
  clearWorkspaceCookies,
  applyInvitationWorkspaceCookies,
  reconcileWorkspaceCookies,
};

/** Clears stale workspace cookies for the signed-in user. */
export async function syncWorkspaceCookies(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await reconcileWorkspaceCookies(session.user.id);
}

export async function setActiveOrganization(
  organizationSlug: string,
  options?: { revalidate?: boolean },
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const org = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
  });
  if (!org) throw new Error("NOT_FOUND");

  const hasAccess = await userHasOrganizationAccess(session.user.id, org.id);
  if (!hasAccess) throw new Error("FORBIDDEN");

  await setActiveOrganizationCookies(organizationSlug);

  if (options?.revalidate === false) return;

  await invalidateBootstrapForUser(session.user.id, org.slug);
  revalidatePath("/dashboard", "layout");
}

export async function setActiveProject(
  projectKey: string,
  options?: { revalidate?: boolean },
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findFirst({
    where: { key: projectKey.toUpperCase() },
    include: { organization: true },
  });
  if (!project) throw new Error("NOT_FOUND");

  await requireProjectAccess(session.user.id, project.id);

  await setOrganizationCookie(project.organization.slug);
  await setProjectCookie(projectKey);

  if (options?.revalidate === false) return;

  await invalidateBootstrapForUser(session.user.id, project.organization.slug);
  revalidatePath("/dashboard", "layout");
}
