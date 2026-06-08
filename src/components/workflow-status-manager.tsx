"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, ListOrdered } from "lucide-react";
import { Button, Input, CustomSelect } from "@/components/ui";
import { useDataStore } from "@/store/data-store";
import { canManageProject } from "@/lib/permissions/client";
import {
  createWorkflowStatus,
  deleteWorkflowStatus,
} from "@/lib/actions/workflow-statuses";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { sortWorkflowStatuses } from "@/lib/projects/workflow-status";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#71717a",
  "#60a5fa",
  "#34d399",
  "#c084fc",
  "#f87171",
  "#fbbf24",
  "#2dd4bf",
];

export function WorkflowStatusManager({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const router = useRouter();
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
  const [color, setColor] = useState(PRESET_COLORS[1]);
  const [adding, setAdding] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [migrateTo, setMigrateTo] = useState("");

  if (!canManage) return null;

  const handleAdd = async () => {
    if (!label.trim()) return;
    setAdding(true);
    try {
      const created = await createWorkflowStatus(projectId, { label, color });
      upsertWorkflowStatus(created);
      setLabel("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (statusKey: string) => {
    if (!migrateTo || migrateTo === statusKey) return;
    setDeletingKey(statusKey);
    try {
      await deleteWorkflowStatus(projectId, statusKey, migrateTo);
      patchIssueStatusBulk(projectId, statusKey, migrateTo);
      removeWorkflowStatus(projectId, statusKey);
      setMigrateTo("");
      router.refresh();
    } finally {
      setDeletingKey(null);
    }
  };

  const migrateOptions = statuses
    .filter((s) => s.key !== deletingKey)
    .map((s) => ({ value: s.key, label: s.label }));

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
                  Workflow statuses
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add or remove columns for list and board views
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
                  <ProjectStatusBadge projectId={projectId} status={s.key} />
                  {statuses.length > 1 && (
                    deletingKey === s.key ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <CustomSelect
                          options={migrateOptions}
                          value={migrateTo}
                          onChange={setMigrateTo}
                          placeholder="Move issues to…"
                          className="w-36"
                          triggerClassName="h-7 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2"
                          disabled={!migrateTo}
                          onClick={() => void handleDelete(s.key)}
                        >
                          Confirm
                        </Button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setDeletingKey(null);
                            setMigrateTo("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={`Delete ${s.label}`}
                        onClick={() => {
                          setDeletingKey(s.key);
                          const fallback = statuses.find((x) => x.key !== s.key);
                          setMigrateTo(fallback?.key ?? "");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-border space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Add status
              </p>
              <div className="flex gap-2">
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. QA, Blocked"
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAdd();
                  }}
                />
                <div className="flex gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        "h-8 w-8 rounded-md border-2 transition-transform",
                        color === c ? "border-primary scale-110" : "border-transparent",
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
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
