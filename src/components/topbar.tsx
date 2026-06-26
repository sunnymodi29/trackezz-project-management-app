"use client";

import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { Avatar, Tooltip } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";
import {
  Bell,
  Bot,
  Plus,
  Search,
  Menu,
  Sparkles,
} from "lucide-react";
import { ProjectSwitcher } from "@/components/project-switcher";
import { DashboardLink } from "@/components/dashboard-link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  assistantPath,
  projectKeyForId,
  issuePath,
} from "@/lib/projects/route";
import { pushWithDashboardRouteTransition } from "@/lib/navigation/dashboard-navigation";
import { markNotificationRead } from "@/lib/actions/notifications";

export function Topbar() {
  const [keyboardShortcut, setKeyboardShortcut] = useState<string>("Ctrl + K");
  const { theme } = useTheme();

  const getKeyboardShortcut = () => {
    if ((navigator as any).userAgentData) {
      const platform = (navigator as any).userAgentData.platform;
      if (platform === "Windows") {
        return "Ctrl + K";
      } else if (platform === "macOS") {
        return "⌘K";
      }
    }
    return "Ctrl + K";
  };

  useEffect(() => {
    setKeyboardShortcut(getKeyboardShortcut());
  }, [keyboardShortcut]);

  const { toggleSidebar, openCommandPalette, openNewIssue, currentProject } =
    useAppStore();
  const {
    notifications,
    projects,
    getUnreadNotificationCount,
    patchNotification,
  } = useDataStore();
  const router = useRouter();
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = getUnreadNotificationCount();
  const recent = notifications.slice(0, 5);

  const assistantHref = currentProject.id
    ? assistantPath(currentProject.key)
    : null;
  const assistantActive =
    assistantHref != null &&
    (pathname === assistantHref || pathname.startsWith(`${assistantHref}?`));

  const openNotification = async (n: (typeof notifications)[0]) => {
    if (!n.read) {
      const updated = await markNotificationRead(n.id);
      patchNotification(n.id, { read: updated.read });
    }
    setNotifOpen(false);
    if (n.type === "invitation" && n.invitation?.token) {
      router.push(`/invite/${n.invitation.token}`);
      return;
    }
    if (n.issue) {
      pushWithDashboardRouteTransition(
        router,
        issuePath(projectKeyForId(projects, n.issue.projectId), n.issue.id),
      );
    }
  };

  return (
    <header className="sticky top-0 right-0 left-0 z-30 h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 gap-3 transition-all duration-200 z-[9999]">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 max-w-[min(100%,360px)]">
          <ProjectSwitcher />
        </div>
      </div>

      {/* Center — Command Palette trigger */}
      <button
        onClick={openCommandPalette}
        className="hidden md:flex items-center gap-2 w-full max-w-sm rounded-lg border border-border bg-muted/50 hover:bg-muted px-3 py-1.5 text-sm text-muted-foreground transition-colors cursor-text"
        aria-label={`Search or jump to (${keyboardShortcut})`}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search or jump to...</span>
        <kbd
          data-platform={keyboardShortcut}
          className="inline-flex h-5 select-none items-center rounded border border-border bg-card px-1.5 font-mono text-[10px]"
        >
          {keyboardShortcut}
        </kbd>
      </button>

      {/* Right */}
      <div className="flex items-center gap-1.5 min-w-72 justify-end">
        {assistantHref && (
          <Tooltip content="Open project assistant" side="bottom">
            <DashboardLink
              href={assistantHref}
              className={cn(
                "hidden sm:flex items-center gap-1.5 rounded-md border text-xs font-medium px-3 py-1.5",
                assistantActive
                  ? "bg-linear-to-l from-violet-600 to-primary"
                  : "transition-colors whitespace-nowrap bg-linear-to-r from-violet-600 to-primary text-primary-foreground shadow-sm",
              )}
              aria-label="Open project assistant"
            >
              <Sparkles className="h-4 w-4" /> Ask AI
            </DashboardLink>
          </Tooltip>
        )}
        <Tooltip content="Create new issue" side="bottom">
          <button
            onClick={() => openNewIssue()}
            className="hidden sm:flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium px-3 py-1.5 transition-colors"
            aria-label="Create new issue"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </Tooltip>

        <Tooltip content={theme === "dark" ? "Light mode" : "Dark mode"} side="bottom">
          <span className="inline-flex">
            <ThemeToggle size="sm" className="border-0 bg-transparent hover:bg-accent" />
          </span>
        </Tooltip>

        {/* Notifications */}
        <div className="relative flex">
          <Tooltip content="Notifications" side="left">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          </Tooltip>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl z-50 animate-scale-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Notifications</span>
                {unread > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                    {unread}
                  </span>
                )}
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {recent.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No notifications yet
                  </p>
                )}
                {recent.map((n) => (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void openNotification(n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void openNotification(n);
                      }
                    }}
                    className={cn(
                      "px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={n.actor.avatarUrl}
                        name={n.actor.name}
                        size="xs"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground">
                          {n.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {n.message}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {formatRelativeTime(n.createdAt)}
                        </div>
                      </div>
                      {!n.read && (
                        <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-border">
                <DashboardLink
                  href="/dashboard/inbox"
                  onClick={() => setNotifOpen(false)}
                  className="block text-center text-xs text-primary hover:underline py-1"
                >
                  View all notifications
                </DashboardLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
