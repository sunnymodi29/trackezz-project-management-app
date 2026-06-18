import { useAppStore } from "@/store/app-store";
import { navigationTargetPath } from "@/lib/auth/auth-navigation-client";

/** Same route transition as sidebar `NavItem` (non–full-screen loader). */
export function beginDashboardRouteTransition(target: string) {
  useAppStore.getState().beginRouteTransition(navigationTargetPath(target));
}

function isDashboardHref(href: string) {
  return href.startsWith("/dashboard");
}

export function pushWithDashboardRouteTransition(
  router: { push: (href: string) => void },
  href: string,
) {
  if (isDashboardHref(href)) beginDashboardRouteTransition(href);
  router.push(href);
}

export function replaceWithDashboardRouteTransition(
  router: { replace: (href: string) => void },
  href: string,
) {
  if (isDashboardHref(href)) beginDashboardRouteTransition(href);
  router.replace(href);
}
