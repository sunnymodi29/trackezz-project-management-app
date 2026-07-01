"use client";

import { BarChart2, FolderOpen, Home, Inbox, Menu, Search } from "lucide-react";
import { DashboardLink } from "@/components/dashboard-link";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox, inbox: true },
  { label: "Projects", href: "/dashboard/projects", icon: FolderOpen },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
] as const;

export function MobileBottomNav() {
  const openCommandPalette = useAppStore((s) => s.openCommandPalette);
  const openMobileNav = useAppStore((s) => s.openMobileNav);
  const unread = useDataStore((s) => s.getUnreadNotificationCount());
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);

  return (
    <nav
      className={cn("fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl md:hidden", mobileNavOpen ? "z-20" : "z-50")}
      aria-label="Mobile primary navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
        {ITEMS.map((item) => (
          <DashboardLink
            key={item.href}
            href={item.href}
            className="relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <item.icon className="h-4 w-4" />
            <span className="truncate">{item.label}</span>
            {item.href === "/dashboard/inbox" && unread > 0 ? (
              <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-primary" />
            ) : null}
          </DashboardLink>
        ))}
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Search or jump"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>
        <button
          type="button"
          onClick={openMobileNav}
          className={cn(
            "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          )}
          aria-label="Open all navigation"
        >
          <Menu className="h-4 w-4" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
