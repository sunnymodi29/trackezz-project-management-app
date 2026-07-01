import { requireWorkspaceBootstrap } from "@/lib/queries/bootstrap";
import { getProjectByRouteParam } from "@/lib/queries/projects";
import { notFound } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarGroup,
  ProgressBar,
  Badge,
} from "@/components/ui";
import {
  StatusBadge,
  PriorityBadge,
  IssueTypeIcon,
} from "@/components/ui/issue-badges";
import { formatRelativeTime } from "@/lib/utils";
import {
  BarChart3,
  Bug,
  CheckCircle2,
  Clock,
  Users,
  Zap,
  ArrowUpRight,
  Target,
} from "lucide-react";
import { DashboardLink } from "@/components/dashboard-link";
import type { Metadata } from "next";
import { issuePath } from "@/lib/projects/route";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId: projectKey } = await params;
  const data = await requireWorkspaceBootstrap();
  const project = await getProjectByRouteParam(
    projectKey,
    data.organization.id,
  );
  return { title: project?.name ?? "Project" };
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectKey } = await params;
  const data = await requireWorkspaceBootstrap();
  const project =
    data.projects.find(
      (p) =>
        p.key.toUpperCase() === projectKey.toUpperCase() || p.id === projectKey,
    ) ?? (await getProjectByRouteParam(projectKey, data.organization.id));
  if (!project) notFound();
  const issues = data.issues.filter((i) => i.projectId === project.id);
  const activeSprint = data.sprints.find(
    (s) => s.projectId === project.id && s.status === "active",
  );
  const openBugs = issues.filter(
    (i) => i.type === "bug" && i.status !== "done",
  );
  const inProgress = issues.filter((i) => i.status === "in-progress");
  const done = issues.filter((i) => i.status === "done");
  const members = data.projectMembers.filter((m) => m.projectId === project.id);

  const stats = [
    {
      label: "Total Issues",
      value: issues.length,
      icon: <BarChart3 className="h-4 w-4" />,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "In Progress",
      value: inProgress.length,
      icon: <Clock className="h-4 w-4" />,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      label: "Open Bugs",
      value: openBugs.length,
      icon: <Bug className="h-4 w-4" />,
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
    {
      label: "Completed",
      value: done.length,
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Project Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
            style={{
              backgroundColor: `${project.color}20`,
              border: `1px solid ${project.color}40`,
            }}
          >
            {project.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 text-2xl font-bold text-foreground">
                {project.name}
              </h1>
              <span className="font-mono text-sm text-muted-foreground bg-muted rounded px-2 py-0.5">
                {project.key}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <DashboardLink href={`/dashboard/projects/${project.key}/board`}>
            <button className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
              View Board <ArrowUpRight className="h-3 w-3" />
            </button>
          </DashboardLink>
          <DashboardLink href={`/dashboard/projects/${project.key}/issues`}>
            <button className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors">
              All Issues
            </button>
          </DashboardLink>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">
                    {s.label}
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {s.value}
                  </div>
                </div>
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}
                >
                  {s.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Issues */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Issues</CardTitle>
                <DashboardLink
                  href={`/dashboard/projects/${project.key}/issues`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View all <ArrowUpRight className="h-3 w-3" />
                </DashboardLink>
              </div>
            </CardHeader>
            <CardContent>
              {issues.length > 0 ? (
                <div className="space-y-1">
                  {issues.slice(0, 8).map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent transition-colors group cursor-pointer"
                    >
                      <DashboardLink
                        href={issuePath(project.key, issue.id)}
                        className="flex items-center gap-3 w-full"
                      >
                        <IssueTypeIcon type={issue.type} />
                        <span className="text-[11px] font-mono text-muted-foreground w-16 shrink-0 group-hover:text-primary transition-colors">
                          {issue.issueKey}
                        </span>
                        <span className="flex-1 min-w-0 text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {issue.title}
                        </span>
                        <PriorityBadge priority={issue.priority} />
                        <StatusBadge status={issue.status} />
                        {issue.assignees.length > 0 && (
                          <AvatarGroup users={issue.assignees} max={2} />
                        )}
                      </DashboardLink>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  No issues found
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Active Sprint */}
          {activeSprint && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Active Sprint
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-semibold text-foreground">
                    {activeSprint.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeSprint.goal}
                  </div>
                </div>
                <ProgressBar
                  value={activeSprint.completedCount}
                  max={activeSprint.issueCount}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{activeSprint.completedCount} done</span>
                  <span>
                    {activeSprint.issueCount - activeSprint.completedCount}{" "}
                    remaining
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Team (
                {members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <Avatar
                      src={m.user.avatarUrl}
                      name={m.user.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground">
                        {m.user.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {m.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Open bugs */}
          {openBugs.length > 0 && (
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Bug className="h-4 w-4" /> Open Bugs ({openBugs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {openBugs.slice(0, 4).map((bug) => (
                    <div key={bug.id} className="flex items-center gap-2">
                      <PriorityBadge priority={bug.priority} />
                      <span className="text-xs text-foreground truncate flex-1">
                        {bug.title}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
