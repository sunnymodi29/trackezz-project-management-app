"use client";

import { usePathname } from "next/navigation";
import { Loader } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

/** Blur + top progress bar while a route change is in flight. */
export function RouteTransitionLoader() {
  const pathname = usePathname();
  const routeTransition = useAppStore((s) => s.routeTransition);
  const projectSwitch = useAppStore((s) => s.projectSwitch);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  if (!routeTransition.active || projectSwitch.active) return null;

  if (routeTransition.fullScreen) {
    return <Loader className="inset-0" aria-label="Loading page" />;
  }

  const inDashboardShell = pathname.startsWith("/dashboard");

  return (
    <Loader
      className={cn(
        inDashboardShell
          ? cn(
              "right-0 top-0 bottom-0",
              sidebarCollapsed ? "left-0 md:left-14" : "left-0 md:left-60",
            )
          : "inset-0",
      )}
      aria-label="Loading page"
    />
  );
}
