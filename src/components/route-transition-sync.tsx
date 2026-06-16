"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { routeTransitionReached } from "@/lib/route-transition";
import { useAppStore } from "@/store/app-store";

const MIN_VISIBLE_MS = 400;
const MAX_VISIBLE_MS = 12_000;

export function RouteTransitionSync() {
  const pathname = usePathname();
  const routeTransition = useAppStore((s) => s.routeTransition);
  const endRouteTransition = useAppStore((s) => s.endRouteTransition);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const projectSwitchActive = useAppStore((s) => s.projectSwitch.active);

  useEffect(() => {
    if (projectSwitchActive) return;
    if (!routeTransition.active || !routeTransition.targetPath) return;

    if (!routeTransitionReached(pathname, routeTransition.targetPath)) return;

    if (!routeTransition.bootstrapReady) return;

    const elapsed = Date.now() - routeTransition.startedAt;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    endTimerRef.current = setTimeout(() => {
      endRouteTransition();
      endTimerRef.current = null;
    }, delay);

    return () => {
      if (endTimerRef.current) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
    };
  }, [
    pathname,
    projectSwitchActive,
    routeTransition.active,
    routeTransition.targetPath,
    routeTransition.startedAt,
    routeTransition.bootstrapReady,
    endRouteTransition,
  ]);

  useEffect(() => {
    if (!routeTransition.active) return;

    const failSafe = setTimeout(() => {
      endRouteTransition();
    }, MAX_VISIBLE_MS);

    return () => clearTimeout(failSafe);
  }, [routeTransition.active, endRouteTransition]);

  return null;
}
