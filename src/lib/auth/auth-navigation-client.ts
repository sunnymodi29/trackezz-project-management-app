"use client";

import { useAppStore } from "@/store/app-store";

type AuthRouter = {
  push: (href: string) => void;
  refresh: () => void;
};

/** Strip query/hash so route transition matches usePathname(). */
export function navigationTargetPath(target: string): string {
  const path = target.split("?")[0].split("#")[0];
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      return new URL(path).pathname;
    } catch {
      return "/dashboard";
    }
  }
  return path || "/dashboard";
}

/** Full-screen loader until the post-auth route (e.g. dashboard) is ready. */
export function beginAuthNavigation(target: string) {
  const path = navigationTargetPath(target);
  useAppStore.getState().beginRouteTransition(path, { fullScreen: true });
}

export function navigateAfterAuth(router: AuthRouter, target: string) {
  beginAuthNavigation(target);
  router.push(target);
  router.refresh();
}
