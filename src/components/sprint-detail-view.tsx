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
import { patchIssueFields } from "@/lib/actions/issues";
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
  const [pendingIssueIds, setPendingIssueIds] = useState<Set<string>>(
    () => new Set(),
  );

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

  const isIssueDone = (issue: Issue) =>
    issue.status === "done" || issue.status === "cancelled";

  const markIssuePending = (issueId: string, pending: boolean) => {
    setPendingIssueIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(issueId);
      else next.delete(issueId);
      return next;
    });
  };

  const assignToSprint = async (issue: Issue) => {
    if (sprint.status === "completed" || pendingIssueIds.has(issue.id)) return;

    const previousIssue = issue;
    const previousSprint = sprint;
    const optimisticIssue = { ...issue, sprintId: sprint.id, sprint };
    const completedDelta = isIssueDone(issue) ? 1 : 0;

    markIssuePending(issue.id, true);
    upsertIssue(optimisticIssue);
    upsertSprint({
      ...sprint,
      issueCount: sprint.issueCount + 1,
      completedCount: sprint.completedCount + completedDelta,
    });

    try {
      const patch = await patchIssueFields(issue.id, { sprintId: sprint.id });
      upsertIssue({
        ...optimisticIssue,
        sprintId: patch.sprintId ?? sprint.id,
        updatedAt: patch.updatedAt,
      });
    } catch (error) {
      upsertIssue(previousIssue);
      upsertSprint(previousSprint);
      console.error(error instanceof Error ? error.message : "Failed to add issue to sprint");
    } finally {
      markIssuePending(issue.id, false);
    }
  };

  const removeFromSprint = async (issue: Issue) => {
    if (pendingIssueIds.has(issue.id)) return;

    const previousIssue = issue;
    const previousSprint = sprint;
    const optimisticIssue = {
      ...issue,
      sprintId: undefined,
      sprint: undefined,
    };
    const completedDelta = isIssueDone(issue) ? 1 : 0;

    markIssuePending(issue.id, true);
    upsertIssue(optimisticIssue);
    upsertSprint({
      ...sprint,
      issueCount: Math.max(0, sprint.issueCount - 1),
      completedCount: Math.max(0, sprint.completedCount - completedDelta),
    });

    try {
      const patch = await patchIssueFields(issue.id, { sprintId: null });
      upsertIssue({
        ...optimisticIssue,
        sprintId: patch.sprintId ?? undefined,
        sprint: undefined,
        updatedAt: patch.updatedAt,
      });
    } catch (error) {
      upsertIssue(previousIssue);
      upsertSprint(previousSprint);
      console.error(error instanceof Error ? error.message : "Failed to remove issue from sprint");
    } finally {
      markIssuePending(issue.id, false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col overflow-y-auto overflow-x-hidden lg:flex-row lg:overflow-hidden">
      <div
        className={cn(
          "flex min-w-0 flex-none flex-col overflow-visible lg:flex-1 lg:overflow-hidden",
          selectedIssueId && "lg:border-r lg:border-border"
        )}
      >
        <div className="space-y-3 border-b border-border bg-card/50 px-4 py-4 sm:px-6">
          <DashboardLink
            href={projectPath(project.key, "/sprints")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All sprints
          </DashboardLink>
          <div className="flex flex-col items-start justify-between gap-4">
            <div className="flex flex-col w-full">
              <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h1 className="min-w-0 text-lg font-bold">{sprint.name}</h1>
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
              <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {sprint.startDate.toLocaleDateString()} — {sprint.endDate.toLocaleDateString()}
                </span>
                <span>
                  {sprint.completedCount}/{sprint.issueCount} done ({progressPct}%)
                </span>
              </div>
              <div className="mt-3 max-w-md w-full">
                <ProgressBar value={sprint.completedCount} max={Math.max(sprint.issueCount, 1)} />
              </div>
            </div>
            {canManage && (
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2">
                {sprint.status === "planning" && (
                  <Button size="sm" onClick={() => void handleStart()} disabled={actionLoading}>
                    <Play className="h-3.5 w-3.5" /> Start
                  </Button>
                )}
                {sprint.status === "active" && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setCompleteOpen(true)}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit Sprint
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Sprint
                </Button>
                {sprint.status === "active" && (
                  <DashboardLink href={projectPath(project.key, "/board")}>
                    <Button size="sm" variant="secondary" className="w-full sm:w-auto">
                      Open Board
                    </Button>
                  </DashboardLink>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-visible p-4 lg:flex-1 lg:overflow-y-auto lg:p-6">
          <h2 className="text-sm font-bold mb-3">
            Sprint issues ({sprintIssues.length})
          </h2>
          {sprintIssues.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No issues in this sprint. Add items from the backlog panel.
            </div>
          ) : (
            <div className="space-y-1">
              {sprintIssues.map((issue) => (
                <SprintIssueRow
                  key={issue.id}
                  issue={issue}
                  canManage={canManage && sprint.status !== "completed"}
                  pending={pendingIssueIds.has(issue.id)}
                  onSelect={() => setSelectedIssueId(issue.id)}
                  onRemove={() => void removeFromSprint(issue)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {canManage && sprint.status !== "completed" && (
        <aside className="flex w-full shrink-0 flex-col border-t border-border bg-card/30 lg:w-80 lg:border-l lg:border-t-0 lg:overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Backlog
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {backlogIssues.length} issues without a sprint
            </p>
          </div>
          <div className="max-h-[52dvh] flex-1 space-y-2 overflow-y-auto p-3 lg:max-h-none lg:space-y-1">
            {backlogIssues.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Backlog is empty.
              </p>
            ) : (
              backlogIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="group flex items-center gap-2 rounded-2xl border border-border bg-card/40 p-3 transition-colors hover:bg-accent/50 lg:rounded-lg lg:border-transparent lg:bg-transparent lg:p-2 lg:hover:border-border"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedIssueId(issue.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {issue.issueKey}
                    </div>
                    <div className="truncate text-sm font-semibold lg:text-xs lg:font-medium">{issue.title}</div>
                  </button>
                  <button
                    type="button"
                    title="Add to sprint"
                    disabled={pendingIssueIds.has(issue.id)}
                    onClick={() => void assignToSprint(issue)}
                    className="shrink-0 rounded-lg p-2 text-primary opacity-100 transition-opacity hover:bg-primary/10 disabled:opacity-40 lg:p-1"
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
  pending,
  onSelect,
  onRemove,
}: {
  issue: Issue;
  canManage: boolean;
  pending: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card/40 px-3 py-3 hover:bg-accent/50 sm:rounded-lg sm:border-transparent sm:bg-transparent sm:py-2 sm:hover:border-border"
    >
      <span className="shrink-0">
        <IssueTypeIcon type={issue.type} />
      </span>
      <span className="text-[10px] font-mono text-muted-foreground w-auto sm:w-14 shrink-0">
        {issue.issueKey}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-xs sm:font-medium">{issue.title}</span>
      <span className="hidden sm:inline-flex">
        <PriorityBadge priority={issue.priority} />
      </span>
      <span className="hidden sm:inline-flex">
        <StatusBadge status={issue.status} />
      </span>
      {canManage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={pending}
          className="rounded-lg px-2 py-2 text-[10px] text-muted-foreground opacity-100 hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 sm:rounded-sm sm:px-1 sm:py-1 sm:opacity-0 sm:group-hover:opacity-100 sm:disabled:opacity-0 sm:hover:disabled:opacity-40"
          aria-label="Remove from sprint"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      )}
    </div>
  );
}
