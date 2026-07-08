"use client";

import { startTransition, useCallback, useMemo, useState } from "react";
import { DashboardLink } from "@/components/dashboard-link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  ArrowRight,
  LayoutGrid,
  List,
  FolderKanban,
  Settings,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  Input,
  Button,
  Tooltip,
  Skeleton,
} from "@/components/ui";
import { ProjectManageDialog } from "@/components/project-manage-dialog";
import { useDataStore } from "@/store/data-store";
import { projectPath } from "@/lib/projects/route";
import { pushWithDashboardRouteTransition } from "@/lib/navigation/dashboard-navigation";
import { projectIconFromName } from "@/lib/projects/project-utils";
import type { Project } from "@/types";
import { canManageProject } from "@/lib/permissions/client";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { setActiveProject } from "@/lib/actions/org";

function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

function ProjectListRowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_80px_100px_120px_48px] gap-4 items-center px-4 py-3 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-8" />
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  );
}

export function ProjectsPageClient() {
  const router = useRouter();
  const { beginProjectSwitch, setCurrentProject, openNewProject } =
    useAppStore();
  const {
    hydrated,
    projects,
    permissions,
    projectMembers,
    currentUser,
    getProjectMembers,
  } = useDataStore();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [manageProject, setManageProject] = useState<Project | null>(null);

  const switchToProject = useCallback(
    (project: Project, destination?: string) => {
      const href = destination ?? projectPath(project.key);
      beginProjectSwitch(project);
      setCurrentProject(project);
      startTransition(() => {
        pushWithDashboardRouteTransition(router, href);
      });
      void setActiveProject(project.key, { revalidate: false });
    },
    [beginProjectSwitch, router, setCurrentProject],
  );

  const canManageByProjectId = useCallback(
    (projectId: string) =>
      canManageProject({ permissions, projectMembers, currentUser }, projectId),
    [permissions, projectMembers, currentUser],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    );
  }, [projects, search]);

  return (
    <>
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-x-hidden animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage and organize your organization&apos;s projects.
            </p>
          </div>
          {permissions.canCreateProject && (
            <Button
              className="gap-2 w-full md:w-auto"
              onClick={() => openNewProject()}
            >
              <Plus className="h-4 w-4" /> New Project
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 py-2 border-y border-border">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Find a project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {projects.length > 0 && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 shrink-0">
              <Tooltip content="Grid view" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 w-10 md:w-auto",
                    view === "grid" &&
                      "bg-background shadow-sm hover:bg-background",
                  )}
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="List view" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 w-10 md:w-auto",
                    view === "list" &&
                      "bg-background shadow-sm hover:bg-background",
                  )}
                  onClick={() => setView("list")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          )}
        </div>

        {view === "grid" ? (
          <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!hydrated &&
              Array.from({ length: 6 }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            {hydrated &&
              filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  members={getProjectMembers(project.id)}
                  canManage={canManageByProjectId(project.id)}
                  onManage={() => setManageProject(project)}
                  onOpen={switchToProject}
                />
              ))}
            {permissions.canCreateProject &&
              hydrated &&
              filtered.length !== 0 && (
                <CreateProjectCard onClick={() => openNewProject()} />
              )}
          </div>
        ) : (
          <div className="min-w-0 space-y-2">
            {hydrated && filtered.length !== 0 && (
              <div className="hidden md:grid grid-cols-[1fr_80px_100px_120px_48px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Project</span>
                <span>Key</span>
                <span>Issues</span>
                <span>Members</span>
                <span />
              </div>
            )}
            {!hydrated &&
              Array.from({ length: 5 }).map((_, i) => (
                <ProjectListRowSkeleton key={i} />
              ))}
            {hydrated &&
              filtered.map((project) => (
                <ProjectListRow
                  key={project.id}
                  project={project}
                  members={getProjectMembers(project.id)}
                  canManage={canManageByProjectId(project.id)}
                  onManage={() => setManageProject(project)}
                  onOpen={switchToProject}
                />
              ))}
            {hydrated && filtered.length === 0 && (
              <EmptyState
                onCreate={() => openNewProject()}
                canCreate={permissions.canCreateProject}
              />
            )}
          </div>
        )}

        {view === "grid" && hydrated && filtered.length === 0 && (
          <EmptyState
            onCreate={() => openNewProject()}
            canCreate={permissions.canCreateProject}
          />
        )}
      </div>

      <ProjectManageDialog
        project={manageProject}
        onClose={() => setManageProject(null)}
      />
    </>
  );
}

function ProjectIcon({ project, name }: { project: Project; name?: string }) {
  const letter = projectIconFromName(name ?? project.name) || project.icon;
  return (
    <div
      className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-inner"
      style={{
        backgroundColor: `${project.color}15`,
        color: project.color,
        border: `1px solid ${project.color}30`,
      }}
    >
      {letter.length === 1 ? letter : project.icon}
    </div>
  );
}

function ProjectCard({
  project,
  members,
  canManage,
  onManage,
  onOpen,
}: {
  project: Project;
  members: ReturnType<
    ReturnType<typeof useDataStore.getState>["getProjectMembers"]
  >;
  canManage: boolean;
  onManage: () => void;
  onOpen: (project: Project, destination?: string) => void;
}) {
  const href = projectPath(project.key);
  return (
    <Card className="hover:border-primary/40 hover:shadow-lg transition-all group relative h-full overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 transition-all group-hover:bg-primary/10" />
      <DashboardLink
        href={href}
        className="block"
        onClick={(e) => {
          e.preventDefault();
          onOpen(project);
        }}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <ProjectIcon project={project} />
            {canManage && (
              <Tooltip content="Manage project" side="bottom">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onManage();
                  }}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground relative z-10 self-center"
                  aria-label="Manage project"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
          </div>
          <CardTitle className="text-lg group-hover:text-primary transition-colors">
            {project.name}
          </CardTitle>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
            {project.description || "No description provided."}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            <span>{project.issueCount} Issues</span>
            <span className="font-mono">{project.key}</span>
          </div>
          <div className="pt-2 flex items-center justify-between">
            <MemberAvatars members={members} total={project.memberCount} />
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Open board"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpen(project, projectPath(project.key, "board"));
                }}
              >
                <FolderKanban className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Open issues"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpen(project, projectPath(project.key, "issues"));
                }}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </DashboardLink>
    </Card>
  );
}

function ProjectListRow({
  project,
  members,
  canManage,
  onManage,
  onOpen,
}: {
  project: Project;
  members: ReturnType<
    ReturnType<typeof useDataStore.getState>["getProjectMembers"]
  >;
  canManage: boolean;
  onManage: () => void;
  onOpen: (project: Project, destination?: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_120px_48px] gap-2 md:gap-4 items-center px-4 py-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
      <DashboardLink
        href={projectPath(project.key)}
        className="flex items-center gap-3 min-w-0"
        onClick={(e) => {
          e.preventDefault();
          onOpen(project);
        }}
      >
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            backgroundColor: `${project.color}15`,
            color: project.color,
            border: `1px solid ${project.color}30`,
          }}
        >
          {projectIconFromName(project.name)}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate hover:text-primary">
            {project.name}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {project.description || "—"}
          </div>
        </div>
      </DashboardLink>
      <span className="font-mono text-xs text-muted-foreground hidden md:block">
        {project.key}
      </span>
      <span className="text-sm hidden md:block">{project.issueCount}</span>
      <div className="hidden md:block">
        <MemberAvatars members={members} total={project.memberCount} compact />
      </div>
      {canManage ? (
        <Tooltip content="Manage project" side="bottom">
          <button
            type="button"
            onClick={onManage}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground justify-self-end self-center"
            aria-label="Manage project"
          >
            <Settings className="h-4 w-4" />
          </button>
        </Tooltip>
      ) : (
        <span className="hidden md:block" aria-hidden />
      )}
    </div>
  );
}

function MemberAvatars({
  members,
  total,
  compact,
}: {
  members: { user: { id: string; name: string; avatarUrl?: string } }[];
  total: number;
  compact?: boolean;
}) {
  const shown = members.slice(0, compact ? 2 : 3);
  const extra = Math.max(0, total - shown.length);

  return (
    <div className="flex -space-x-2">
      {shown.map((m) => (
        <Avatar
          key={m.user.id}
          src={m.user.avatarUrl}
          name={m.user.name}
          size="sm"
          className="border-2 border-background"
        />
      ))}
      {extra > 0 && (
        <div className="rounded-full border-2 border-background bg-muted flex items-center justify-center font-bold text-muted-foreground h-7 w-7 text-[9px] z-10">
          +{extra}
        </div>
      )}
      {shown.length === 0 && (
        <span className="text-xs text-muted-foreground">No members</span>
      )}
    </div>
  );
}

function CreateProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:border-primary/50 hover:bg-primary/2 transition-all group min-h-[220px] w-full"
    >
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Plus className="h-8 w-8" />
      </div>
      <div>
        <div className="font-bold">Create a new Project</div>
        <p className="text-xs text-muted-foreground mt-1">
          Start a new journey with your team.
        </p>
      </div>
    </button>
  );
}

function EmptyState({
  onCreate,
  canCreate,
}: {
  onCreate: () => void;
  canCreate: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <FolderKanban className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-sm font-medium">No projects match your search</p>
      {canCreate && (
        <Button className="mt-4 gap-2" size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4" /> New Project
        </Button>
      )}
    </div>
  );
}
