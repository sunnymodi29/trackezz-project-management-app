import { cookies } from "next/headers";
import {
  ACTIVE_ORG_COOKIE,
  ACTIVE_PROJECT_COOKIE,
  expireWorkspaceCookieOptions,
  orgCookieOptions,
  projectCookieOptions,
} from "@/lib/org/cookies";
import { prisma } from "@/lib/db";
import {
  requireProjectAccess,
  userHasOrganizationAccess,
} from "@/lib/auth/rbac";

/** Remove active org and project cookies. */
export async function clearWorkspaceCookies(): Promise<void> {
  const cookieStore = await cookies();
  const expire = expireWorkspaceCookieOptions();
  // Expire with the same path/httpOnly/secure/sameSite as creation — `delete()` alone often leaves httpOnly cookies.
  cookieStore.set(ACTIVE_ORG_COOKIE, "", expire);
  cookieStore.set(ACTIVE_PROJECT_COOKIE, "", expire);
  cookieStore.delete(ACTIVE_ORG_COOKIE);
  cookieStore.delete(ACTIVE_PROJECT_COOKIE);
}

/** Remove only the active project cookie. */
export async function clearActiveProjectCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_PROJECT_COOKIE);
}

export async function setOrganizationCookie(
  organizationSlug: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationSlug, orgCookieOptions());
}

export async function setProjectCookie(projectKey: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    ACTIVE_PROJECT_COOKIE,
    projectKey.toUpperCase(),
    projectCookieOptions(),
  );
}

/** Set org cookie and clear project (org switch or org-only context). */
export async function setActiveOrganizationCookies(
  organizationSlug: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationSlug, orgCookieOptions());
  cookieStore.delete(ACTIVE_PROJECT_COOKIE);
}

/** Set org + optional project after accepting an invitation. */
export async function applyInvitationWorkspaceCookies(
  organizationSlug: string,
  projectKey?: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationSlug, orgCookieOptions());
  if (projectKey) {
    cookieStore.set(
      ACTIVE_PROJECT_COOKIE,
      projectKey.toUpperCase(),
      projectCookieOptions(),
    );
  } else {
    cookieStore.delete(ACTIVE_PROJECT_COOKIE);
  }
}

/**
 * Align cookies with the user's current access. Clears stale org/project values.
 * Call from Server Actions only (not during RSC render).
 */
export async function reconcileWorkspaceCookies(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const orgSlug = cookieStore.get(ACTIVE_ORG_COOKIE)?.value?.trim();
  const projectKey = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value?.trim();

  if (!orgSlug && !projectKey) return;

  if (!orgSlug) {
    if (projectKey) cookieStore.delete(ACTIVE_PROJECT_COOKIE);
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });

  if (!org || !(await userHasOrganizationAccess(userId, org.id))) {
    cookieStore.delete(ACTIVE_ORG_COOKIE);
    cookieStore.delete(ACTIVE_PROJECT_COOKIE);
    return;
  }

  if (!projectKey) return;

  const project = await prisma.project.findFirst({
    where: {
      organizationId: org.id,
      key: projectKey.toUpperCase(),
    },
    select: { id: true },
  });

  if (!project) {
    cookieStore.delete(ACTIVE_PROJECT_COOKIE);
    return;
  }

  try {
    await requireProjectAccess(userId, project.id);
  } catch {
    cookieStore.delete(ACTIVE_PROJECT_COOKIE);
  }
}
