"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { DashboardLink } from "@/components/dashboard-link";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { setActiveProject } from "@/lib/actions/org";
import { projectPath } from "@/lib/projects/route";
import { pushWithDashboardRouteTransition } from "@/lib/navigation/dashboard-navigation";
import { Skeleton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

function ProjectIcon({
  project,
  size = "md",
}: {
  project: Pick<Project, "name" | "color" | "icon">;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm";
  const isEmoji = project.icon && project.icon.length <= 4;

  if (isEmoji) {
    return (
      <div
        className={cn(
          "rounded-md flex items-center justify-center shrink-0 bg-muted/60",
          dim,
        )}
      >
        <span className="leading-none">{project.icon}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md flex items-center justify-center font-bold text-white shrink-0 shadow-sm",
        dim,
      )}
      style={{
        backgroundColor: project.color,
        backgroundImage: `linear-gradient(135deg, ${project.color}, ${project.color}cc)`,
      }}
    >
      {project.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ProjectSwitcher() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    currentProject,
    setCurrentProject,
    beginProjectSwitch,
    openNewProject,
  } = useAppStore();
  const { projects, permissions } = useDataStore();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const hasActiveProject = projects.length > 0 && Boolean(currentProject.id);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase()),
  );

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const switchProject = useCallback(
    (project: Project) => {
      if (project.id === currentProject.id) {
        close();
        return;
      }
      beginProjectSwitch(project);
      setCurrentProject(project);
      close();
      startTransition(() => {
        pushWithDashboardRouteTransition(
          router,
          projectPath(project.key),
        );
      });
      void setActiveProject(project.key, { revalidate: false });
    },
    [beginProjectSwitch, close, currentProject.id, router, setCurrentProject],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.clearTimeout(t);
    };
  }, [close, open]);

  if (!hasActiveProject) {
    if (permissions.canCreateProject) {
      return (
        <>
          <button
            type="button"
            onClick={() => openNewProject()}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4 text-primary" />
            Create project
          </button>
        </>
      );
    }
    return null;
  }

  const overviewHref = projectPath(currentProject.key);

  return (
    <>
      <div
        ref={containerRef}
        className="relative flex min-w-0 max-w-full items-center gap-0.5 pr-0 sm:gap-1 sm:pr-1"
      >
        <DashboardLink
          href={overviewHref}
          className="flex min-w-0 items-center gap-2 py-1.5 pl-1 pr-0 transition-colors sm:gap-2.5 sm:pl-2.5 sm:pr-1"
        >
          <ProjectIcon project={currentProject} />
          <span className="min-w-0 text-sm font-medium text-foreground truncate">
            {currentProject.name ? (
              currentProject.name
            ) : (
              <Skeleton className="h-4 w-32" />
            )}
          </span>
        </DashboardLink>

        <Tooltip content="Switch project" side="bottom">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "shrink-0 rounded-md p-1.5 m-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              open && "bg-accent text-foreground",
            )}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="Switch project"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </Tooltip>
        {open && (
          <div
            className="fixed inset-x-3 top-16 z-50 animate-scale-in overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:absolute md:inset-auto md:left-0 md:top-full md:mt-0 md:w-[min(100vw-2rem,360px)] md:rounded-xl"
            role="listbox"
          >
            <div className="p-2 border-b border-border">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find Project..."
                  className="min-h-11 w-full rounded-xl border border-border bg-muted/40 py-2 pl-8 pr-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 md:min-h-0 md:rounded-lg md:text-sm"
                />
                <kbd className="absolute right-2.5 hidden sm:inline-flex h-5 select-none items-center rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
                  Esc
                </kbd>
              </div>
            </div>

            <div className="max-h-[min(60dvh,420px)] overflow-y-auto py-1 md:max-h-[280px]">
              {filteredProjects.map((project) => {
                const selected = project.id === currentProject.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => switchProject(project)}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-2.5 px-3 py-2 text-left transition-colors md:min-h-0",
                      selected
                        ? "bg-accent text-foreground"
                        : "hover:bg-accent/50 text-foreground",
                    )}
                  >
                    <ProjectIcon project={project} size="sm" />
                    <span className="flex-1 min-w-0 text-sm truncate">
                      {project.name}
                    </span>
                    {selected && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
              {filteredProjects.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No projects found
                </p>
              )}
            </div>

            {permissions.canCreateProject && (
              <div className="border-t border-border p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    openNewProject();
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
