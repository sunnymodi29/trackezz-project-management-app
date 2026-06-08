"use client";

import { useMemo, useState } from "react";
import { X, Plus, Trash2, ListOrdered, Pencil, Check } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useDataStore } from "@/store/data-store";
import { canManageProject } from "@/lib/permissions/client";
import {
  createWorkflowStatus,
  deleteWorkflowStatus,
  updateWorkflowStatus,
} from "@/lib/actions/workflow-statuses";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { randomStatusColor, sortWorkflowStatuses } from "@/lib/projects/workflow-status";
import { cn } from "@/lib/utils";
import type { WorkflowStatus } from "@/types";

export function WorkflowStatusManager({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const permissions = useDataStore((s) => s.permissions);
  const projectMembers = useDataStore((s) => s.projectMembers);
  const currentUser = useDataStore((s) => s.currentUser);
  const workflowStatuses = useDataStore((s) => s.workflowStatuses);
  const upsertWorkflowStatus = useDataStore((s) => s.upsertWorkflowStatus);
  const removeWorkflowStatus = useDataStore((s) => s.removeWorkflowStatus);
  const patchIssueStatusBulk = useDataStore((s) => s.patchIssueStatusBulk);

  const canManage = canManageProject(
    { permissions, projectMembers, currentUser },
    projectId,
  );

  const statuses = useMemo(
    () =>
      sortWorkflowStatuses(
        workflowStatuses.filter((s) => s.projectId === projectId),
      ),
    [workflowStatuses, projectId],
  );

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  if (!canManage) return null;

  const handleAdd = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setAdding(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: WorkflowStatus = {
      id: tempId,
      projectId,
      key: slugifyPreview(trimmed),
      label: trimmed,
      color: randomStatusColor(),
      position: statuses.length,
      createdAt: new Date(),
    };
    upsertWorkflowStatus(optimistic);
    setLabel("");
    try {
      const created = await createWorkflowStatus(projectId, {
        label: trimmed,
        color: optimistic.color,
      });
      removeWorkflowStatus(projectId, optimistic.key);
      upsertWorkflowStatus(created);
    } catch {
      removeWorkflowStatus(projectId, optimistic.key);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (statusKey: string, currentLabel: string) => {
    setEditingKey(statusKey);
    setEditLabel(currentLabel);
    setDeletingKey(null);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditLabel("");
  };

  const handleSaveEdit = async (statusKey: string) => {
    const trimmed = editLabel.trim();
    if (!trimmed) return;

    const current = statuses.find((s) => s.key === statusKey);
    if (!current) return;
    if (current.label === trimmed) {
      cancelEdit();
      return;
    }

    upsertWorkflowStatus({ ...current, label: trimmed });
    cancelEdit();

    try {
      const updated = await updateWorkflowStatus(projectId, statusKey, {
        label: trimmed,
      });
      upsertWorkflowStatus(updated);
    } catch {
      upsertWorkflowStatus(current);
      setEditingKey(statusKey);
      setEditLabel(trimmed);
    }
  };

  const handleDelete = async (statusKey: string) => {
    try {
      const { migrateToKey } = await deleteWorkflowStatus(projectId, statusKey);
      patchIssueStatusBulk(projectId, statusKey, migrateToKey);
      removeWorkflowStatus(projectId, statusKey);
      if (editingKey === statusKey) cancelEdit();
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("gap-1.5", className)}
        onClick={() => setOpen(true)}
      >
        <ListOrdered className="h-3.5 w-3.5" />
        Statuses
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Project statuses
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add, edit, or remove statuses for your project
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
              {statuses.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  {editingKey === s.key ? (
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-7 text-xs flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSaveEdit(s.key);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                  ) : (
                    <ProjectStatusBadge projectId={projectId} status={s.key} />
                  )}

                  {statuses.length > 1 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {editingKey === s.key ? (
                        <>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:not-disabled:text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                            aria-label="Save status"
                            disabled={!editLabel.trim()}
                            onClick={() => void handleSaveEdit(s.key)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            aria-label="Cancel edit"
                            onClick={cancelEdit}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : deletingKey === s.key ? (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => void handleDelete(s.key)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            onClick={() => setDeletingKey(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label={`Edit ${s.label}`}
                            onClick={() => startEdit(s.key, s.label)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label={`Delete ${s.label}`}
                            onClick={() => {
                              setDeletingKey(s.key);
                              cancelEdit();
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-border space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Add status
              </p>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. QA, Blocked"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAdd();
                }}
              />
              <Button
                size="sm"
                className="w-full gap-1.5"
                disabled={adding || !label.trim()}
                onClick={() => void handleAdd()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add status
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function slugifyPreview(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "status";
}
