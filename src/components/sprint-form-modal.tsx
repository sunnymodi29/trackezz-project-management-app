"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button, Input, Textarea, DatePicker, Checkbox } from "@/components/ui";
import { cn } from "@/lib/utils";
import { toDateKey } from "@/lib/issues/dates";
import type { Sprint } from "@/types";
import { toastError } from "@/lib/ui/toast";

function defaultEndDate(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  return end;
}

export interface SprintFormValues {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  startImmediately: boolean;
}

interface SprintFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: SprintFormValues) => Promise<void>;
  sprint?: Sprint | null;
  loading?: boolean;
}

export function SprintFormModal({
  open,
  onClose,
  onSubmit,
  sprint,
  loading = false,
}: SprintFormModalProps) {
  const isEdit = Boolean(sprint);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(toDateKey(new Date()));
  const [endDate, setEndDate] = useState(toDateKey(defaultEndDate(new Date())));
  const [startImmediately, setStartImmediately] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (sprint) {
      setName(sprint.name);
      setGoal(sprint.goal ?? "");
      setStartDate(toDateKey(sprint.startDate));
      setEndDate(toDateKey(sprint.endDate));
      setStartImmediately(false);
    } else {
      const start = new Date();
      setName("");
      setGoal("");
      setStartDate(toDateKey(start));
      setEndDate(toDateKey(defaultEndDate(start)));
      setStartImmediately(false);
    }
  }, [open, sprint]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError("Sprint name is required");
      return;
    }
    if (endDate < startDate) {
      toastError("End date must be on or after start date");
      return;
    }
    try {
      await onSubmit({
        name: name.trim(),
        goal: goal.trim(),
        startDate,
        endDate,
        startImmediately: !isEdit && startImmediately,
      });
      onClose();
    } catch (err) {
      toastError(err, "Failed to save sprint");
    }
  };

  return (
    <div className="fixed inset-0 z-10000 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="relative flex max-h-dvh w-full max-w-md flex-col rounded-t-2xl border border-border bg-card shadow-2xl animate-fade-in sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold">{isEdit ? "Edit Sprint" : "Create Sprint"}</h2>
          <button type="button" onClick={onClose} disabled={loading} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New Sprint" disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Goal (optional)</label>
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should this sprint achieve?"
              rows={2}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Start</label>
              <DatePicker
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  if (v && endDate && endDate < v) {
                    setEndDate(v);
                  }
                }}
                disabled={loading}
                clearable={false}
                max={endDate || undefined}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">End</label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                disabled={loading}
                clearable={false}
                min={startDate || undefined}
              />
            </div>
          </div>
          {!isEdit && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={startImmediately}
                onCheckedChange={setStartImmediately}
                disabled={loading}
                aria-label="Start sprint immediately"
              />
              Start sprint immediately (completes any other active sprint)
            </label>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading || !name.trim()}>
            {loading ? "Saving…" : isEdit ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
