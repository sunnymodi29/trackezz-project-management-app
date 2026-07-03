"use client";

import { Loader } from "@/components/ui";
import { useAppStore } from "@/store/app-store";

/** Solid full-screen loader — only for hard refresh / direct load, not client route changes. */
export function DashboardPageLoader({
  label = "Loading page",
}: {
  label?: string;
}) {
  const routeTransitionActive = useAppStore((s) => s.routeTransition.active);
  const projectSwitchActive = useAppStore((s) => s.projectSwitch.active);

  if (routeTransitionActive || projectSwitchActive) return null;

  return <Loader solid className="inset-0" aria-label={label} />;
}
