"use client";

import { useMemo, useState } from "react";
import { DashboardLink } from "@/components/dashboard-link";
import { useRouter, useParams } from "next/navigation";
import {
  Target,
  Calendar,
  CheckSquare,
  Clock,
  ArrowRight,
  TrendingUp,
  Play,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  ProgressBar,
  Avatar,
  Button,
} from "@/components/ui";
import {
  SprintFormModal,
  type SprintFormValues,
} from "@/components/sprint-form-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDataStore } from "@/store/data-store";
import {
  resolveProjectFromParam,
  projectPath,
  sprintPath,
} from "@/lib/projects/route";
import { canManageProjectIssues } from "@/lib/permissions/client";
import {
  createSprint,
  updateSprint,
  startSprint,
  completeSprint,
} from "@/lib/actions/sprints";
import { dateFromKey } from "@/lib/issues/dates";
import { cn } from "@/lib/utils";
import type { Sprint } from "@/types";

function sprintBadgeLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) return last;
  return name.slice(0, 2).toUpperCase();
}

export function ProjectSprints() {
  const params = useParams();
  const router = useRouter();
  const routeParam = params.projectId as string;
  const {
    projects,
    sprints,
    issues,
    permissions,
    projectMembers,
    currentUser,
    upsertSprint,
  } = useDataStore();

  const project = useMemo(
    () => resolveProjectFromParam(projects, routeParam) ?? projects[0],
    [projects, routeParam],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [saving, setSaving] = useState(false);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  if (!project?.id) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] p-8 text-center">
        <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h1 className="text-lg font-semibold">No project selected</h1>
      </div>
    );
  }

  const canManage = canManageProjectIssues(
    { permissions, projectMembers, currentUser },
    project.id,
  );

  const projectSprints = sprints.filter((s) => s.projectId === project.id);
  const activeSprint = projectSprints.find((s) => s.status === "active");
  const activeSprintIssues = activeSprint
    ? issues.filter((i) => i.sprintId === activeSprint.id)
    : [];
  const contributors = Array.from(
    new Map(
      activeSprintIssues.flatMap((i) => i.assignees.map((a) => [a.id, a])),
    ).values(),
  );
  const daysRemaining = activeSprint
    ? Math.max(
        0,
        Math.ceil(
          (activeSprint.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;
  const committedPoints = activeSprintIssues.reduce(
    (sum, i) => sum + (i.estimate ?? 0),
    0,
  );
  const completedPoints = activeSprintIssues
    .filter((i) => i.status === "done")
    .reduce((sum, i) => sum + (i.estimate ?? 0), 0);
  const inProgressCount = activeSprintIssues.filter(
    (i) => i.status === "in-progress",
  ).length;
  const pastSprints = projectSprints.filter((s) => s.status === "completed");
  const plannedSprints = projectSprints.filter((s) => s.status === "planning");

  const handleCreateOrEdit = async (values: SprintFormValues) => {
    setSaving(true);
    try {
      if (editingSprint) {
        const updated = await updateSprint(editingSprint.id, {
          name: values.name,
          goal: values.goal || undefined,
          startDate: dateFromKey(values.startDate),
          endDate: dateFromKey(values.endDate),
        });
        upsertSprint(updated);
      } else {
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
            .filter((s) => s.status === "active" && s.id !== created.id)
            .forEach((s) => upsertSprint({ ...s, status: "completed" }));
        }
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (sprintId: string) => {
    const updated = await startSprint(sprintId);
    upsertSprint(updated);
    projectSprints
      .filter((s) => s.status === "active" && s.id !== sprintId)
      .forEach((s) => upsertSprint({ ...s, status: "completed" }));
    router.refresh();
  };

  const handleComplete = async () => {
    if (!completeId) return;
    setCompleting(true);
    try {
      const updated = await completeSprint(completeId, true);
      upsertSprint(updated);
      const store = useDataStore.getState();
      store.issues
        .filter(
          (i) =>
            i.sprintId === completeId &&
            i.status !== "done" &&
            i.status !== "cancelled",
        )
        .forEach((i) =>
          store.upsertIssue({ ...i, sprintId: undefined, sprint: undefined }),
        );
      router.refresh();
    } finally {
      setCompleting(false);
      setCompleteId(null);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-8 max-w-6xl mx-auto animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" /> Sprint Planning
            </h1>
            <p className="text-muted-foreground mt-1">
              Plan and monitor your team&apos;s development cycles.
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setEditingSprint(null);
                setModalOpen(true);
              }}
              className="w-full shadow-lg shadow-primary/20 sm:w-auto"
            >
              {activeSprint ? "New Sprint" : "Start New Sprint"}
            </Button>
          )}
        </div>

        {activeSprint && (
          <Card className="bg-primary/3 border-primary/20">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge className="mb-2">CURRENT SPRINT</Badge>
                  <CardTitle className="text-xl">
                    <DashboardLink
                      href={sprintPath(project.key, activeSprint.id)}
                      className="hover:text-primary transition-colors"
                    >
                      {activeSprint.name}
                    </DashboardLink>
                  </CardTitle>
                  {activeSprint.goal && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeSprint.goal}
                    </p>
                  )}
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {activeSprint.startDate.toLocaleDateString()} —{" "}
                      {activeSprint.endDate.toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {daysRemaining}{" "}
                      {daysRemaining === 1 ? "day " : "days "}
                      remaining
                    </span>
                  </div>
                </div>
                <div className="shrink-0 sm:text-right">
                  <div className="text-sm font-bold text-primary">
                    {activeSprint.completedCount}/{activeSprint.issueCount} Done
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {completedPoints}/
                    {committedPoints || activeSprint.issueCount} pts
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setCompleteId(activeSprint.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Overall Progress</span>
                  <span>
                    {activeSprint.issueCount
                      ? Math.round(
                          (activeSprint.completedCount /
                            activeSprint.issueCount) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <ProgressBar
                  value={activeSprint.completedCount}
                  max={Math.max(activeSprint.issueCount, 1)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    In Progress
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium">
                      {inProgressCount} issues
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Sprint Scope
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium">
                      {activeSprintIssues.length} issues
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                    Contributors
                  </div>
                  <div className="flex items-center -space-x-2">
                    {contributors.slice(0, 4).map((u) => (
                      <Avatar
                        key={u.id}
                        src={u.avatarUrl}
                        name={u.name}
                        size="xs"
                        className="border-2 border-background"
                      />
                    ))}
                    {contributors.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No assignees yet
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-2 flex-col sm:flex-row">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(projectPath(project.key, "/board"))}
                className="inline-flex items-center gap-2 sm:w-auto w-full"
              >
                Go to Active Board <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push(sprintPath(project.key, activeSprint.id))}
                className="inline-flex items-center gap-2 sm:w-auto w-full"
              >
                Go to Active Sprint <ArrowRight className="h-4 w-4" />
              </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-base font-bold">History & Planned</h2>
          {plannedSprints.length === 0 && pastSprints.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
              No planned or completed sprints yet. Create one to get started.
            </p>
          )}
          <div className="space-y-3">
            {[...plannedSprints, ...pastSprints].map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all group"
              >
                <DashboardLink
                  href={sprintPath(project.key, s.id)}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                      s.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {sprintBadgeLabel(s.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold group-hover:text-primary transition-colors truncate">
                      {s.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.status === "completed"
                        ? `Finished ${s.endDate.toLocaleDateString()}`
                        : `Starts ${s.startDate.toLocaleDateString()}`}
                    </div>
                  </div>
                </DashboardLink>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:flex flex-col items-end">
                    <div className="text-xs font-bold">
                      {s.completedCount}/{s.issueCount} Issues
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Completion:{" "}
                      {s.issueCount
                        ? Math.round((s.completedCount / s.issueCount) * 100)
                        : 0}
                      %
                    </div>
                  </div>
                  {canManage && s.status === "planning" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleStart(s.id)}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Play className="h-3.5 w-3.5" /> Start
                    </Button>
                  )}
                  <DashboardLink
                    href={sprintPath(project.key, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-muted transition-all"
                  >
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </DashboardLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SprintFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSprint(null);
        }}
        sprint={editingSprint}
        onSubmit={handleCreateOrEdit}
        loading={saving}
      />

      <ConfirmDialog
        open={Boolean(completeId)}
        title="Complete sprint?"
        description="Incomplete issues will be moved back to the backlog. This sprint will be marked completed."
        confirmLabel="Complete Sprint"
        loading={completing}
        onClose={() => setCompleteId(null)}
        onConfirm={() => void handleComplete()}
      />
    </>
  );
}
