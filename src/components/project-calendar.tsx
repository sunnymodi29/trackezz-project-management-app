"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { Button, Checkbox } from "@/components/ui";
import { IssueTypeIcon, PriorityIcon, StatusBadge } from "@/components/ui/issue-badges";
import { useAppStore } from "@/store/app-store";
import { usePersistIssue } from "@/lib/issues/use-persist-issue";
import {
  coerceDate,
  dateFromKey,
  isPastDay,
  isToday,
  startOfDay,
  toDateKey,
} from "@/lib/issues/dates";
import IssueDrawer from "@/components/issue-drawer";
import type { Issue } from "@/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
  none: "bg-muted-foreground/40",
};

interface ProjectCalendarProps {
  projectId: string;
  projectName: string;
  issues: Issue[];
}

export function ProjectCalendar({
  projectId,
  projectName,
  issues,
}: ProjectCalendarProps) {
  const { openNewIssue } = useAppStore();
  const { persist, saving } = usePersistIssue();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [showDone, setShowDone] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const projectIssues = useMemo(
    () => issues.filter((i) => i.projectId === projectId),
    [issues, projectId]
  );

  const visibleIssues = useMemo(
    () =>
      projectIssues.filter(
        (i) =>
          showDone ||
          (i.status !== "done" && i.status !== "cancelled")
      ),
    [projectIssues, showDone]
  );

  const { scheduled, unscheduled } = useMemo(() => {
    const scheduled: Issue[] = [];
    const unscheduled: Issue[] = [];
    for (const issue of visibleIssues) {
      if (coerceDate(issue.dueDate)) scheduled.push(issue);
      else unscheduled.push(issue);
    }
    return { scheduled, unscheduled };
  }, [visibleIssues]);

  const issuesByDay = useMemo(() => {
    const map = new Map<string, Issue[]>();
    for (const issue of scheduled) {
      const d = coerceDate(issue.dueDate);
      if (!d) continue;
      const key = toDateKey(d);
      const list = map.get(key) ?? [];
      list.push(issue);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        const order = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
        return (order[a.priority] ?? 5) - (order[b.priority] ?? 5);
      });
    }
    return map;
  }, [scheduled]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const activeIssue = activeDragId
    ? projectIssues.find((i) => i.id === activeDragId)
    : null;

  const scheduleIssue = async (issueId: string, day: Date) => {
    await persist(issueId, { dueDate: startOfDay(day) });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || typeof over.id !== "string" || !over.id.startsWith("day:")) {
      return;
    }
    const dayKey = over.id.slice(4);
    const issueId = String(active.id);
    await scheduleIssue(issueId, dateFromKey(dayKey));
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden",
          selectedIssueId && "border-r border-border"
        )}
      >
        <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Calendar
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {projectName} · drag issues onto a day to set due dates
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={showDone}
                onCheckedChange={setShowDone}
                aria-label="Show completed issues"
              />
              Show completed
            </label>
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs font-semibold min-w-[140px]"
                onClick={() => setViewMonth(startOfMonth(new Date()))}
              >
                {format(viewMonth, "MMMM yyyy")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewMonth(startOfMonth(new Date()))}
            >
              Today
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={(e: DragStartEvent) => setActiveDragId(String(e.active.id))}
          onDragEnd={(e) => void handleDragEnd(e)}
        >
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border min-h-[480px]">
              {WEEKDAYS.map((label) => (
                <div
                  key={label}
                  className="bg-muted/50 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {label}
                </div>
              ))}
              {calendarDays.map((day) => {
                const key = toDateKey(day);
                const dayIssues = issuesByDay.get(key) ?? [];
                const inMonth = isSameMonth(day, viewMonth);
                const today = isToday(day);
                const past = isPastDay(day);

                return (
                  <CalendarDayCell
                    key={key}
                    dayKey={key}
                    day={day}
                    issues={dayIssues}
                    inMonth={inMonth}
                    today={today}
                    past={past}
                    saving={saving}
                    onSelectIssue={setSelectedIssueId}
                    onAddIssue={() => openNewIssue({ dueDate: startOfDay(day) })}
                  />
                );
              })}
            </div>
          </div>

          <DragOverlay>
            {activeIssue ? (
              <IssueCalendarChip issue={activeIssue} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <aside className="w-72 shrink-0 border-l border-border flex flex-col bg-card/50">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Unscheduled</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {unscheduled.length} issue{unscheduled.length !== 1 ? "s" : ""} without a due date
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {unscheduled.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              All visible issues are on the calendar.
            </p>
          ) : (
            unscheduled.map((issue) => (
              <DraggableIssueCard
                key={issue.id}
                issue={issue}
                onClick={() => setSelectedIssueId(issue.id)}
              />
            ))
          )}
        </div>
      </aside>

      {selectedIssueId && (
        <IssueDrawer
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </div>
  );
}

function CalendarDayCell({
  dayKey,
  day,
  issues,
  inMonth,
  today,
  past,
  saving,
  onSelectIssue,
  onAddIssue,
}: {
  dayKey: string;
  day: Date;
  issues: Issue[];
  inMonth: boolean;
  today: boolean;
  past: boolean;
  saving: boolean;
  onSelectIssue: (id: string) => void;
  onAddIssue: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dayKey}` });
  const maxVisible = 3;
  const extra = issues.length - maxVisible;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group min-h-[100px] bg-card p-1.5 flex flex-col transition-colors",
        !inMonth && "bg-muted/20",
        today && "ring-1 ring-inset ring-primary/40 bg-primary/5",
        isOver && "bg-primary/10 ring-1 ring-primary/30",
        past && inMonth && "opacity-90"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
            today && "bg-primary text-primary-foreground",
            !today && inMonth && "text-foreground",
            !inMonth && "text-muted-foreground/50"
          )}
        >
          {format(day, "d")}
        </span>
        {inMonth && (
          <button
            type="button"
            onClick={onAddIssue}
            disabled={saving}
            className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity"
            title="Create issue on this day"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        {issues.slice(0, maxVisible).map((issue) => (
          <DraggableIssueCard
            key={issue.id}
            issue={issue}
            compact
            onClick={() => onSelectIssue(issue.id)}
          />
        ))}
        {extra > 0 && (
          <button
            type="button"
            onClick={() => onSelectIssue(issues[maxVisible]!.id)}
            className="text-[10px] text-muted-foreground hover:text-foreground w-full text-left px-1"
          >
            +{extra} more
          </button>
        )}
      </div>
    </div>
  );
}

function DraggableIssueCard({
  issue,
  compact,
  onClick,
}: {
  issue: Issue;
  compact?: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: issue.id,
  });
  const due = coerceDate(issue.dueDate);
  const overdue =
    due &&
    isPastDay(due) &&
    issue.status !== "done" &&
    issue.status !== "cancelled";

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn(isDragging && "opacity-40")}>
      <IssueCalendarChip issue={issue} compact={compact} overdue={!!overdue} onClick={onClick} />
    </div>
  );
}

function IssueCalendarChip({
  issue,
  compact,
  overdue,
  isDragging,
  onClick,
}: {
  issue: Issue;
  compact?: boolean;
  overdue?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded border border-border/80 bg-background hover:bg-accent/60 transition-colors flex items-start gap-1.5",
        compact ? "px-1.5 py-1" : "px-2 py-1.5",
        overdue && "border-red-500/40 bg-red-500/5",
        isDragging && "shadow-lg ring-1 ring-primary/30"
      )}
    >
      <span
        className={cn(
          "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
          PRIORITY_DOT[issue.priority] ?? PRIORITY_DOT.none
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <IssueTypeIcon type={issue.type} />
          <span className="text-[10px] font-mono text-muted-foreground">{issue.issueKey}</span>
        </span>
        <span className={cn("block truncate text-foreground", compact ? "text-[10px]" : "text-xs")}>
          {issue.title}
        </span>
        {!compact && (
          <span className="flex items-center gap-1 mt-0.5">
            <PriorityIcon priority={issue.priority} />
            <StatusBadge status={issue.status} />
          </span>
        )}
      </span>
    </button>
  );
}
