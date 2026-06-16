"use client";

import { startTransition, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutWithLoader } from "@/lib/auth/sign-out-client";
import { projectPath } from "@/lib/projects/route";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { Avatar, Skeleton, Tooltip } from "@/components/ui";
import { setActiveProject } from "@/lib/actions/org";
import { cn } from "@/lib/utils";
import { canManageProject } from "@/lib/permissions/client";
import type { Project } from "@/types";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Inbox,
  Search,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Zap,
  Target,
  GitBranch,
  Bug,
  FileText,
  Users,
  ChevronsLeft,
  ListTodo,
  Calendar,
  Layers,
  FolderOpen,
  LogOut,
  SquareKanban,
} from "lucide-react";

const MAIN_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Tasks", href: "/dashboard/my-tasks", icon: CheckSquare },
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { label: "Projects", href: "/dashboard/projects", icon: FolderOpen },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
];

const PROJECT_NAV = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Issues", href: "/issues", icon: ListTodo },
  { label: "Board", href: "/board", icon: SquareKanban },
  { label: "Backlog", href: "/backlog", icon: Layers },
  { label: "Sprints", href: "/sprints", icon: Target },
  { label: "Bugs", href: "/bugs", icon: Bug },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Members", href: "/members", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    currentProject,
    setCurrentProject,
    beginProjectSwitch,
    openNewIssue,
    openCommandPalette,
  } = useAppStore();
  const {
    projects,
    organization,
    permissions,
    projectMembers,
    currentUser,
    getUnreadNotificationCount,
  } = useDataStore();

  const canManageCurrentProject = useMemo(
    () =>
      currentProject.id
        ? canManageProject(
            { permissions, projectMembers, currentUser },
            currentProject.id,
          )
        : false,
    [permissions, projectMembers, currentUser, currentProject.id],
  );

  const visibleProjectNav = useMemo(
    () =>
      PROJECT_NAV.filter(
        (item) =>
          canManageCurrentProject ||
          (item.href !== "/members" && item.href !== "/settings"),
      ),
    [canManageCurrentProject],
  );
  const hasActiveProject = projects.length > 0 && Boolean(currentProject.id);
  const showProjectSwitcher =
    hasActiveProject && (projects.length > 1 || permissions.canCreateProject);
  const pathname = usePathname();
  const router = useRouter();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const unread = getUnreadNotificationCount();

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      project.key.toLowerCase().includes(projectSearch.toLowerCase()),
  );

  const handleSignOut = useCallback(async () => {
    await signOutWithLoader("/login");
  }, []);

  const switchProject = useCallback(
    (project: Project) => {
      if (project.id === currentProject.id) {
        setProjectsOpen(false);
        setProjectSearch("");
        return;
      }
      beginProjectSwitch(project);
      setCurrentProject(project);
      setProjectsOpen(false);
      setProjectSearch("");
      startTransition(() => {
        router.push(projectPath(project.key));
      });
      void setActiveProject(project.key, { revalidate: false });
    },
    [beginProjectSwitch, currentProject.id, router, setCurrentProject],
  );

  const isMainNavActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    // Project list only — not /dashboard/projects/{key}/board|list|...
    if (href === "/dashboard/projects") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const projectBase = hasActiveProject ? projectPath(currentProject.key) : "";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-200",
        sidebarCollapsed ? "w-14" : "w-60",
      )}
    >
      {/* Logo / Workspace */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-border">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground truncate">
                TrackEzz
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {organization?.name ? (
                  organization?.name
                ) : (
                  <Skeleton className="h-4 w-20" />
                )}
              </div>
            </div>
          </Link>
        )}
        {sidebarCollapsed && (
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Zap className="h-4 w-4 text-white" />
          </div>
        )}
        {/* {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1 hover:bg-accent transition-colors text-muted-foreground"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )} */}
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {/* Active Project Context Switcher */}

        {/* Quick actions */}
        {/* {!sidebarCollapsed && (
          <div className="flex gap-1.5 mb-3">
            <button
              onClick={() => openNewIssue()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium py-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New Issue
            </button>
            <button
              onClick={openCommandPalette}
              className="flex items-center justify-center rounded-md border border-border hover:bg-accent text-muted-foreground px-2 py-1.5 transition-colors"
              title="Command palette (⌘K)"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>
        )} */}

        {/* Main nav */}
        {MAIN_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon className="h-4 w-4 shrink-0" />}
            active={isMainNavActive(item.href)}
            collapsed={sidebarCollapsed}
            badge={
              item.href === "/dashboard/inbox" && unread > 0
                ? unread
                : undefined
            }
          />
        ))}

        {/* Per-project nav — only when a project exists */}
        {hasActiveProject && !sidebarCollapsed && (
          <div className="mt-4">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {currentProject.name ? (
                currentProject.name
              ) : (
                <Skeleton className="h-3 w-24" />
              )}
            </div>
            {visibleProjectNav.map((item) => {
              const href = `${projectBase}${item.href}`;
              const active =
                item.href === ""
                  ? pathname === projectBase
                  : pathname.startsWith(`${projectBase}${item.href}`);
              return (
                <NavItem
                  key={item.label}
                  href={href}
                  label={item.label}
                  icon={<item.icon className="h-4 w-4 shrink-0" />}
                  active={active}
                  collapsed={false}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* User Profile */}
      <div
        className={cn(
          "border-t border-border p-3",
          sidebarCollapsed
            ? "flex flex-col items-center gap-2"
            : "flex items-center gap-2.5",
        )}
      >
        {sidebarCollapsed ? (
          <>
            <Tooltip content="Expand sidebar" side="right">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
              >
                <Avatar
                  src={currentUser.avatarUrl}
                  name={currentUser.name}
                  size="sm"
                />
              </button>
            </Tooltip>
            <Tooltip content="Sign out" side="right">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </Tooltip>
          </>
        ) : (
          <>
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-foreground truncate">
                {currentUser.name ? (
                  currentUser.name
                ) : (
                  <Skeleton className="h-3 w-24" />
                )}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {currentUser.email ? (
                  currentUser.email
                ) : (
                  <Skeleton className="h-3 w-32 mt-1" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip content="Settings" side="top">
                <Link
                  href="/dashboard/settings"
                  aria-label="Settings"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </Tooltip>
              <Tooltip content="Sign out" side="top">
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  aria-label="Sign out"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  collapsed,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  const beginRouteTransition = useAppStore((s) => s.beginRouteTransition);

  const link = (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      onClick={() => {
        if (!active) beginRouteTransition(href);
      }}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors relative",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        collapsed && "justify-center w-full",
      )}
    >
      {icon}
      {!collapsed && <span className="flex-1">{label}</span>}
      {badge && badge > 0 && !collapsed && (
        <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
          {badge}
        </span>
      )}
      {badge && badge > 0 && collapsed && (
        <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={label} side="right" className="w-full">
        {link}
      </Tooltip>
    );
  }

  return link;
}
