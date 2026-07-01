"use client";

import { useParams, useRouter } from "next/navigation";
import { DashboardLink } from "@/components/dashboard-link";
import {
  resolveProjectFromParam,
  projectPath,
  sprintPath,
} from "@/lib/projects/route";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { StatusBadge, PriorityBadge, IssueTypeIcon } from "@/components/ui/issue-badges";
import { Avatar, AvatarGroup, Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { SprintFormModal, type SprintFormValues } from "@/components/sprint-form-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { canManageProjectIssues } from "@/lib/permissions/client";
import { createSprint, completeSprint } from "@/lib/actions/sprints";
import { dateFromKey } from "@/lib/issues/dates";
import {
  Plus,
  Layers,
  ChevronDown,
  GripVertical,
  MoreHorizontal,
  Target,
} from "lucide-react";
import { useState, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import IssueDrawer from "@/components/issue-drawer";
import type { Issue } from "@/types";
import { buildIssueTree } from "@/lib/issues/tree";
import { IssueTreeList } from "@/components/issue-tree-list";

export default function BacklogPage() {
  const params = useParams();
  const router = useRouter();
  const { openNewIssue } = useAppStore();
  const {
    projects,
    sprints,
    epics,
    labels,
    issues,
    permissions,
    projectMembers,
    currentUser,
    getIssuesByProject,
    upsertSprint,
    upsertIssue,
  } = useDataStore();
  const routeParam = params.projectId as string;
  const project = resolveProjectFromParam(projects, routeParam) ?? projects[0];
  const projectDbId = project?.id ?? "";
  const projectIssues = getIssuesByProject(projectDbId);

  const projectSprints = sprints
    .filter((s) => s.projectId === projectDbId)
    .sort((a, b) => {
      const order = { active: 0, planning: 1, completed: 2 };
      return order[a.status] - order[b.status] || b.startDate.getTime() - a.startDate.getTime();
    });

  const backlogIssues = projectIssues.filter((i) => !i.sprintId);
  const backlogTree = useMemo(
    () => buildIssueTree(backlogIssues),
    [backlogIssues],
  );

  const sprintIssueTrees = useMemo(
    () =>
      projectSprints.map((sprint) => ({
        sprint,
        tree: buildIssueTree(
          projectIssues.filter((i) => i.sprintId === sprint.id),
        ),
      })),
    [projectSprints, projectIssues],
  );
  const projectEpics = epics.filter((e) => e.projectId === projectDbId);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [savingSprint, setSavingSprint] = useState(false);
  const [completeSprintId, setCompleteSprintId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const projectLabels = labels.filter((l) => l.projectId === projectDbId);

  const canManage = projectDbId
    ? canManageProjectIssues(
        { permissions, projectMembers, currentUser },
        projectDbId
      )
    : false;

  const handleCreateSprint = async (values: SprintFormValues) => {
    if (!project) return;
    setSavingSprint(true);
    try {
      const created = await createSprint({
        projectId: project.id,
        name: values.name,
        goal: values.goal || undefined,
        startDate: dateFromKey(values.startDate),
        endDate: dateFromKey(values.endDate),
        status: values.startImmediately ? "active" : "planning",
      });
      upsertSprint(created);
      if (values.startImmediately) {
        projectSprints
          .filter((s) => s.status === "active")
          .forEach((s) => upsertSprint({ ...s, status: "completed" }));
      }
      router.refresh();
    } finally {
      setSavingSprint(false);
    }
  };

  const handleCompleteSprint = async () => {
    if (!completeSprintId) return;
    setCompleting(true);
    try {
      const updated = await completeSprint(completeSprintId, true);
      upsertSprint(updated);
      issues
        .filter(
          (i) =>
            i.sprintId === completeSprintId &&
            i.status !== "done" &&
            i.status !== "cancelled"
        )
        .forEach((i) => upsertIssue({ ...i, sprintId: undefined, sprint: undefined }));
      router.refresh();
    } finally {
      setCompleting(false);
      setCompleteSprintId(null);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-muted-foreground text-sm">
        No project selected.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-56px)] overflow-hidden">
      <div
        className={cn(
          "flex flex-col flex-1 overflow-hidden",
          selectedIssueId && "md:border-r md:border-border"
        )}
      >
        <div className="flex flex-col gap-3 border-b border-border bg-card/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="text-lg font-bold">Backlog</h1>
            <p className="text-xs text-muted-foreground">
              {projectIssues.length} issues · {backlogIssues.length} unscheduled
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setSprintModalOpen(true)}>
                Create Sprint
              </Button>
            )}
            <DashboardLink href={projectPath(project.key, "/sprints")}>
              <Button size="sm" variant="ghost" className="gap-1.5">
                <Target className="h-3.5 w-3.5" /> Sprints
              </Button>
            </DashboardLink>
            <Button size="sm" onClick={() => openNewIssue()} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Issue
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 sm:p-6">
          {projectSprints.map((sprint) => (
            <div key={sprint.id} className="space-y-3">
              <div className="group flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex items-center justify-center p-1 rounded hover:bg-muted cursor-pointer">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  <DashboardLink
                    href={sprintPath(project.key, sprint.id)}
                    className="text-sm font-bold hover:text-primary transition-colors truncate"
                  >
                    {sprint.name}
                  </DashboardLink>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {sprint.startDate.toLocaleDateString()} —{" "}
                    {sprint.endDate.toLocaleDateString()}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold shrink-0",
                      sprint.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : sprint.status === "completed"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {sprint.status}
                  </span>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <div className="text-[10px] text-muted-foreground">
                    {sprint.issueCount} issues
                  </div>
                  {canManage && sprint.status === "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => setCompleteSprintId(sprint.id)}
                    >
                      Complete Sprint
                    </Button>
                  )}
                  <DashboardLink
                    href={sprintPath(project.key, sprint.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </DashboardLink>
                </div>
              </div>
              <div className="ml-2 space-y-1 border-l-2 border-border/50 pl-3 sm:ml-6 sm:pl-4">
                {(() => {
                  const st = sprintIssueTrees.find((x) => x.sprint.id === sprint.id);
                  const tree = st?.tree ?? [];
                  if (tree.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground py-2 italic">
                        No issues — open sprint to add from backlog.
                      </p>
                    );
                  }
                  return (
                    <IssueTreeList
                      tree={tree}
                      renderRow={({ node, depth, expandControl }) => (
                        <BacklogTreeRow
                          issue={node.issue}
                          depth={depth}
                          expandControl={expandControl}
                          onSelect={(i) => setSelectedIssueId(i.id)}
                        />
                      )}
                    />
                  );
                })()}
              </div>
            </div>
          ))}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" /> Backlog
              </h2>
              <span className="text-xs text-muted-foreground">{backlogIssues.length} issues</span>
            </div>
            <div className="space-y-1">
              {backlogTree.length > 0 ? (
                <IssueTreeList
                  tree={backlogTree}
                  renderRow={({ node, depth, expandControl }) => (
                    <BacklogTreeRow
                      issue={node.issue}
                      depth={depth}
                      expandControl={expandControl}
                      onSelect={(i) => setSelectedIssueId(i.id)}
                    />
                  )}
                />
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground">
                  Backlog is empty. Move issues here to store them for future sprints.
                </div>
              )}
              <button
                type="button"
                onClick={() => openNewIssue()}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 rounded-lg transition-colors border border-transparent hover:border-border"
              >
                <Plus className="h-3.5 w-3.5" /> Create Issue
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 pt-12 border-t border-border">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Epics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {projectEpics.map((epic) => (
                  <div
                    key={epic.id}
                    className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium" style={{ color: epic.color }}>
                        {epic.name}
                      </span>
                      <span className="text-muted-foreground">{epic.progress}%</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${epic.progress}%`, backgroundColor: epic.color }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Filter by Label</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {projectLabels.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No labels in this project
                    </span>
                  )}
                  {projectLabels.map((l) => (
                    <div
                      key={l.id}
                      className="px-2 py-1 rounded-md text-[10px] font-medium border border-border hover:border-primary/50 cursor-pointer transition-colors"
                      style={{ backgroundColor: `${l.color}20`, color: l.color }}
                    >
                      {l.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {selectedIssueId && (
        <IssueDrawer
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          onNavigateIssue={setSelectedIssueId}
        />
      )}

      <SprintFormModal
        open={sprintModalOpen}
        onClose={() => setSprintModalOpen(false)}
        onSubmit={handleCreateSprint}
        loading={savingSprint}
      />

      <ConfirmDialog
        open={Boolean(completeSprintId)}
        title="Complete sprint?"
        description="Incomplete issues will be moved back to the backlog."
        confirmLabel="Complete Sprint"
        loading={completing}
        onClose={() => setCompleteSprintId(null)}
        onConfirm={() => void handleCompleteSprint()}
      />
    </div>
  );
}

function BacklogTreeRow({
  issue,
  depth,
  expandControl,
  onSelect,
}: {
  issue: Issue;
  depth: number;
  expandControl: ReactNode;
  onSelect: (issue: Issue) => void;
}) {
  return (
    <div
      onClick={() => onSelect(issue)}
      className="group flex items-center gap-2 pr-3 py-2 rounded-lg hover:bg-accent/50 cursor-pointer border border-transparent hover:border-border transition-all"
      style={{ paddingLeft: `calc(0.75rem + ${depth * 16}px)` }}
    >
      <div
        className="opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground transition-opacity shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-1 shrink-0">{expandControl}</div>
      <div className="shrink-0">
        <IssueTypeIcon type={issue.type} />
      </div>
      <div className="shrink-0 text-[10px] font-mono text-muted-foreground w-14">
        {issue.issueKey}
      </div>
      <div className="flex-1 min-w-0 text-xs font-medium truncate group-hover:text-primary transition-colors">
        {issue.title}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:block">
          <PriorityBadge priority={issue.priority} />
        </div>
        <div className="hidden md:block">
          <StatusBadge status={issue.status} />
        </div>
        {issue.estimate && (
          <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded">
            {issue.estimate}
          </span>
        )}
        {issue.assignees.length > 0 && <AvatarGroup users={issue.assignees} max={2} />}
      </div>
    </div>
  );
}
