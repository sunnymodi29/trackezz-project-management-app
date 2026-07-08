"use client";

import { useMemo, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  ListOrdered,
  Pencil,
  Check,
  Shuffle,
} from "lucide-react";
import { Button, Input, Tooltip } from "@/components/ui";
import { StatusBadge } from "@/components/ui/issue-badges";
import { useDataStore } from "@/store/data-store";
import { canManageProject } from "@/lib/permissions/client";
import {
  createWorkflowStatus,
  deleteWorkflowStatus,
  updateWorkflowStatus,
} from "@/lib/actions/workflow-statuses";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import {
  colorToHex,
  randomStatusColor,
  sortWorkflowStatuses,
  statusColorWithAlpha,
} from "@/lib/projects/workflow-status";
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
  const [addColor, setAddColor] = useState(() => randomStatusColor());
  const [adding, setAdding] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [colorEditingKey, setColorEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
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
      color: addColor,
      position: statuses.length,
      createdAt: new Date(),
    };
    upsertWorkflowStatus(optimistic);
    setLabel("");
    setAddColor(randomStatusColor());
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

  const startEdit = (status: WorkflowStatus) => {
    setEditingKey(status.key);
    setEditLabel(status.label);
    setEditColor(status.color);
    setColorEditingKey(null);
    setDeletingKey(null);
  };

  const startColorEdit = (status: WorkflowStatus) => {
    setColorEditingKey(status.key);
    setEditColor(status.color);
    setEditingKey(null);
    setDeletingKey(null);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditLabel("");
    setEditColor("");
  };

  const cancelColorEdit = () => {
    setColorEditingKey(null);
    setEditColor("");
  };

  const handleSaveEdit = async (statusKey: string) => {
    const trimmed = editLabel.trim();
    if (!trimmed) return;

    const current = statuses.find((s) => s.key === statusKey);
    if (!current) return;
    if (current.label === trimmed && current.color === editColor) {
      cancelEdit();
      return;
    }

    const optimistic = { ...current, label: trimmed, color: editColor };
    upsertWorkflowStatus(optimistic);
    cancelEdit();

    try {
      const updated = await updateWorkflowStatus(projectId, statusKey, {
        label: trimmed,
        color: editColor,
      });
      upsertWorkflowStatus(updated);
    } catch {
      upsertWorkflowStatus(current);
      setEditingKey(statusKey);
      setEditLabel(trimmed);
      setEditColor(editColor);
    }
  };

  const handleSaveColor = async (statusKey: string) => {
    const current = statuses.find((s) => s.key === statusKey);
    if (!current) return;
    if (current.color === editColor) {
      cancelColorEdit();
      return;
    }

    const optimistic = { ...current, color: editColor };
    upsertWorkflowStatus(optimistic);
    cancelColorEdit();

    try {
      const updated = await updateWorkflowStatus(projectId, statusKey, {
        color: editColor,
      });
      upsertWorkflowStatus(updated);
    } catch {
      upsertWorkflowStatus(current);
      setColorEditingKey(statusKey);
      setEditColor(editColor);
    }
  };

  const handleDelete = async (statusKey: string) => {
    try {
      const { migrateToKey } = await deleteWorkflowStatus(projectId, statusKey);
      patchIssueStatusBulk(projectId, statusKey, migrateToKey);
      removeWorkflowStatus(projectId, statusKey);
      if (editingKey === statusKey) cancelEdit();
      if (colorEditingKey === statusKey) cancelColorEdit();
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
        <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl animate-scale-in border border-border bg-card shadow-2xl">
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
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <StatusColorPicker
                        value={editColor}
                        onChange={setEditColor}
                      />
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-7 text-xs flex-1 min-w-0"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit(s.key);
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <StatusBadge
                        status={s.key}
                        label={editLabel.trim() || s.label}
                        color={editColor}
                        backgroundColor={statusColorWithAlpha(editColor, 0.082)}
                        borderColor={statusColorWithAlpha(editColor, 0.25)}
                      />
                    </div>
                  ) : colorEditingKey === s.key ? (
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <StatusColorPicker
                        value={editColor}
                        onChange={setEditColor}
                      />
                      <StatusBadge
                        status={s.key}
                        label={s.label}
                        color={editColor}
                        backgroundColor={statusColorWithAlpha(editColor, 0.082)}
                        borderColor={statusColorWithAlpha(editColor, 0.25)}
                      />
                    </div>
                  ) : (
                    <ProjectStatusBadge
                      projectId={projectId}
                      status={s.key}
                      backgroundColor={statusColorWithAlpha(s.color, 0.082)}
                      borderColor={statusColorWithAlpha(s.color, 0.25)}
                    />
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
                      ) : colorEditingKey === s.key ? (
                        <>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:not-disabled:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                            aria-label="Save color"
                            onClick={() => void handleSaveColor(s.key)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            aria-label="Cancel color edit"
                            onClick={cancelColorEdit}
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
                          {/* <button
                            type="button"
                            className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border transition-opacity hover:opacity-80"
                            style={{
                              backgroundColor: statusColorWithAlpha(s.color, 0.082),
                              borderColor: statusColorWithAlpha(s.color, 0.25),
                            }}
                            aria-label={`Change color for ${s.label}`}
                            onClick={() => startColorEdit(s)}
                          >
                            <span
                              className="absolute inset-1 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                          </button> */}
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label={`Edit ${s.label}`}
                            onClick={() => startEdit(s)}
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
                              cancelColorEdit();
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
              <div className="flex items-center gap-2">
                <StatusColorPicker value={addColor} onChange={setAddColor} />
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. QA, Blocked"
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAdd();
                  }}
                />
              </div>
              {label.trim() && (
                <StatusBadge
                  status={slugifyPreview(label.trim())}
                  label={label.trim()}
                  color={addColor}
                  backgroundColor={statusColorWithAlpha(addColor, 0.082)}
                  borderColor={statusColorWithAlpha(addColor, 0.25)}
                  className="break-all"
                />
              )}
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

function StatusColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const hexValue = colorToHex(value);

  return (
    <div className="flex items-center gap-1 shrink-0">
      <label
        className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-border"
        style={{
          backgroundColor: statusColorWithAlpha(value, 0.082),
          borderColor: statusColorWithAlpha(value, 0.25),
        }}
        aria-label="Choose status color"
      >
        <span
          className="absolute inset-1 rounded-full"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <Tooltip content="Random color">
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Random color"
          onClick={() => onChange(randomStatusColor())}
        >
          <Shuffle className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
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
