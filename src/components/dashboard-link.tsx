"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useAppStore } from "@/store/app-store";
import { navigationTargetPath } from "@/lib/auth/auth-navigation-client";

export type DashboardLinkProps = ComponentPropsWithoutRef<typeof Link>;

/**
 * Next.js `Link` that starts the same in-shell route loader as sidebar nav when
 * navigating between dashboard routes.
 */
export const DashboardLink = forwardRef<HTMLAnchorElement, DashboardLinkProps>(
  function DashboardLink({ href, onClick, ...rest }, ref) {
    const pathname = usePathname();
    const beginRouteTransition = useAppStore((s) => s.beginRouteTransition);
    const closeMobileNav = useAppStore((s) => s.closeMobileNav);

    return (
      <Link
        ref={ref}
        href={href}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          const raw =
            typeof href === "string"
              ? href
              : `${href.pathname ?? ""}${href.search ?? ""}`;
          if (!raw.startsWith("/dashboard")) return;
          const next = navigationTargetPath(raw);
          closeMobileNav();
          if (next !== pathname) beginRouteTransition(next);
        }}
        {...rest}
      />
    );
  },
);
