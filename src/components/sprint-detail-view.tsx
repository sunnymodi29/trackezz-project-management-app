"use client";

import { useMemo, useState } from "react";
import { DashboardLink } from "@/components/dashboard-link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Target,
  Play,
  CheckCircle2,
  Pencil,
  Trash2,
  Plus,
  Layers,
} from "lucide-react";
import { Button, Badge, ProgressBar, Card, CardContent } from "@/components/ui";
import { StatusBadge, PriorityBadge, IssueTypeIcon } from "@/components/ui/issue-badges";
import { SprintFormModal, type SprintFormValues } from "@/components/sprint-form-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import IssueDrawer from "@/components/issue-drawer";
import { useDataStore } from "@/store/data-store";
import { resolveProjectFromParam, projectPath } from "@/lib/projects/route";
import { pushWithDashboardRouteTransition } from "@/lib/navigation/dashboard-navigation";
import { canManageProjectIssues } from "@/lib/permissions/client";
import {
  updateSprint,
  startSprint,
  completeSprint,
  deleteSprint,
} from "@/lib/actions/sprints";
import { updateIssue } from "@/lib/actions/issues";
import { dateFromKey } from "@/lib/issues/dates";
import { cn } from "@/lib/utils";
import type { Issue, Sprint, SprintStatus } from "@/types";

const STATUS_STYLES: Record<SprintStatus, string> = {
  planning: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-400",
};

export function SprintDetailView() {
  const params = useParams();
  const router = useRouter();
  const routeParam = params.projectId as string;
  const sprintId = params.sprintId as string;

  const {
    projects,
    sprints,
    issues,
    permissions,
    projectMembers,
    currentUser,
    upsertSprint,
    removeSprint,
    upsertIssue,
  } = useDataStore();

  const project = useMemo(
    () => resolveProjectFromParam(projects, routeParam) ?? projects[0],
    [projects, routeParam]
  );

  const sprint = sprints.find((s) => s.id === sprintId && s.projectId === project?.id);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const canManage = project
    ? canManageProjectIssues(
        { permissions, projectMembers, currentUser },
        project.id
      )
    : false;

  const sprintIssues = useMemo(
    () =>
      sprint
        ? issues.filter((i) => i.projectId === project?.id && i.sprintId === sprint.id)
        : [],
    [issues, sprint, project?.id]
  );

  const backlogIssues = useMemo(
    () =>
      project
        ? issues.filter((i) => i.projectId === project.id && !i.sprintId)
        : [],
    [issues, project]
  );

  if (!project?.id) {
    return (
      <div className="p-8 text-center text-muted-foreground">Project not found.</div>
    );
  }

  if (!sprint) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Sprint not found.</p>
        <DashboardLink href={projectPath(project.key, "/sprints")}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back to Sprints
          </Button>
        </DashboardLink>
      </div>
    );
  }

  const progressPct = sprint.issueCount
    ? Math.round((sprint.completedCount / sprint.issueCount) * 100)
    : 0;

  const handleEdit = async (values: SprintFormValues) => {
    setSaving(true);
    try {
      const updated = await updateSprint(sprint.id, {
        name: values.name,
        goal: values.goal || undefined,
        startDate: dateFromKey(values.startDate),
        endDate: dateFromKey(values.endDate),
      });
      upsertSprint(updated);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const updated = await startSprint(sprint.id);
      upsertSprint(updated);
      sprints
        .filter((s) => s.projectId === project.id && s.status === "active" && s.id !== sprint.id)
        .forEach((s) => upsertSprint({ ...s, status: "completed" }));
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const updated = await completeSprint(sprint.id, true);
      upsertSprint(updated);
      sprintIssues
        .filter((i) => i.status !== "done" && i.status !== "cancelled")
        .forEach((i) => upsertIssue({ ...i, sprintId: undefined, sprint: undefined }));
      router.refresh();
    } finally {
      setActionLoading(false);
      setCompleteOpen(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteSprint(sprint.id);
      removeSprint(sprint.id);
      pushWithDashboardRouteTransition(
        router,
        projectPath(project.key, "/sprints"),
      );
      router.refresh();
    } finally {
      setActionLoading(false);
      setDeleteOpen(false);
    }
  };

  const assignToSprint = async (issue: Issue) => {
    if (sprint.status === "completed") return;
    const updated = await updateIssue(issue.id, { sprintId: sprint.id });
    upsertIssue(updated);
    router.refresh();
  };

  const removeFromSprint = async (issue: Issue) => {
    const updated = await updateIssue(issue.id, { sprintId: null });
    upsertIssue(updated);
    router.refresh();
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <div
        className={cn(
          "flex flex-col flex-1 overflow-hidden",
          selectedIssueId && "border-r border-border"
        )}
      >
        <div className="px-6 py-4 border-b border-border bg-card/50 space-y-3">
          <DashboardLink
            href={projectPath(project.key, "/sprints")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All sprints
          </DashboardLink>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold">{sprint.name}</h1>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold",
                    STATUS_STYLES[sprint.status]
                  )}
                >
                  {sprint.status}
                </span>
              </div>
              {sprint.goal && (
                <p className="text-sm text-muted-foreground max-w-2xl">{sprint.goal}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {sprint.startDate.toLocaleDateString()} — {sprint.endDate.toLocaleDateString()}
                </span>
                <span>
                  {sprint.completedCount}/{sprint.issueCount} done ({progressPct}%)
                </span>
              </div>
              <div className="mt-3 max-w-md">
                <ProgressBar value={sprint.completedCount} max={Math.max(sprint.issueCount, 1)} />
              </div>
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {sprint.status === "planning" && (
                  <Button size="sm" onClick={() => void handleStart()} disabled={actionLoading}>
                    <Play className="h-3.5 w-3.5" /> Start
                  </Button>
                )}
                {sprint.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCompleteOpen(true)}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit Sprint
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Sprint
                </Button>
                {sprint.status === "active" && (
                  <DashboardLink href={projectPath(project.key, "/board")}>
                    <Button size="sm" variant="secondary">
                      Open Board
                    </Button>
                  </DashboardLink>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-sm font-bold mb-3">
            Sprint issues ({sprintIssues.length})
          </h2>
          {sprintIssues.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
              No issues in this sprint. Add items from the backlog panel.
            </div>
          ) : (
            <div className="space-y-1">
              {sprintIssues.map((issue) => (
                <SprintIssueRow
                  key={issue.id}
                  issue={issue}
                  canManage={canManage && sprint.status !== "completed"}
                  onSelect={() => setSelectedIssueId(issue.id)}
                  onRemove={() => void removeFromSprint(issue)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {canManage && sprint.status !== "completed" && (
        <aside className="w-80 shrink-0 border-l border-border bg-card/30 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Backlog
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {backlogIssues.length} issues without a sprint
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {backlogIssues.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Backlog is empty.
              </p>
            ) : (
              backlogIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 border border-transparent hover:border-border group"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedIssueId(issue.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {issue.issueKey}
                    </div>
                    <div className="text-xs font-medium truncate">{issue.title}</div>
                  </button>
                  <button
                    type="button"
                    title="Add to sprint"
                    onClick={() => void assignToSprint(issue)}
                    className="shrink-0 p-1 rounded opacity-100 hover:bg-primary/10 text-primary transition-opacity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {selectedIssueId && (
        <IssueDrawer
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
        />
      )}

      <SprintFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        sprint={sprint}
        onSubmit={handleEdit}
        loading={saving}
      />

      <ConfirmDialog
        open={completeOpen}
        title="Complete sprint?"
        description="Incomplete issues will return to the backlog."
        confirmLabel="Complete"
        loading={actionLoading}
        onClose={() => setCompleteOpen(false)}
        onConfirm={() => void handleComplete()}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete sprint?"
        description="All issues will be unassigned from this sprint. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={actionLoading}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

function SprintIssueRow({
  issue,
  canManage,
  onSelect,
  onRemove,
}: {
  issue: Issue;
  canManage: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 cursor-pointer border border-transparent hover:border-border"
    >
      <IssueTypeIcon type={issue.type} />
      <span className="text-[10px] font-mono text-muted-foreground w-14 shrink-0">
        {issue.issueKey}
      </span>
      <span className="flex-1 min-w-0 text-xs font-medium truncate">{issue.title}</span>
      <PriorityBadge priority={issue.priority} />
      <StatusBadge status={issue.status} />
      {canManage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-[10px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 px-2 py-1 rounded hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      )}
    </div>
  );
}
