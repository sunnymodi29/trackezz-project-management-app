"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { updateIssueStatus, reorderKanbanIssues } from "@/lib/actions/issues";
import type { Issue } from "@/types";
import {
  PriorityIcon,
  IssueTypeIcon,
  LabelChip,
  SeverityBadge,
} from "@/components/ui/issue-badges";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { WorkflowStatusManager } from "@/components/workflow-status-manager";
import { Avatar, AvatarGroup, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Plus, MessageSquare, Paperclip, GripVertical } from "lucide-react";
import IssueDrawer from "@/components/issue-drawer";

interface BoardColumn {
  id: string;
  label: string;
  color: string;
}

interface BoardState {
  [key: string]: Issue[];
}

function compareKanbanOrder(a: Issue, b: Issue): number {
  if (a.kanbanOrder !== b.kanbanOrder) return a.kanbanOrder - b.kanbanOrder;
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

export default function BoardPage() {
  const { currentProject, openNewIssue } = useAppStore();
  const projectId = currentProject.id;
  const issues = useDataStore((s) => s.issues);
  const upsertIssue = useDataStore((s) => s.upsertIssue);
  const patchIssue = useDataStore((s) => s.patchIssue);
  const sprints = useDataStore((s) => s.sprints);
  const getWorkflowStatuses = useDataStore((s) => s.getWorkflowStatuses);

  const columns: BoardColumn[] = useMemo(
    () =>
      getWorkflowStatuses(projectId).map((s) => ({
        id: s.key,
        label: s.label,
        color: s.color,
      })),
    [getWorkflowStatuses, projectId],
  );

  const activeSprint = sprints.find(
    (s) => s.projectId === projectId && s.status === "active",
  );

  const projectIssues = useMemo(() => {
    const base = issues.filter((i) => i.projectId === projectId);
    if (activeSprint) {
      return base.filter((i) => i.sprintId === activeSprint.id);
    }
    return base;
  }, [issues, projectId, activeSprint]);

  const board = useMemo(
    () =>
      columns.reduce((acc, col) => {
        acc[col.id] = projectIssues
          .filter((i) => i.status === col.id)
          .sort(compareKanbanOrder);
        return acc;
      }, {} as BoardState),
    [projectIssues, columns],
  );

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [drawerIssueId, setDrawerIssueId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const issue = projectIssues.find((i) => i.id === active.id);
    if (issue) setActiveIssue(issue);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveIssue(null);
    if (!over) return;

    const draggedIssue = projectIssues.find((i) => i.id === active.id);
    if (!draggedIssue) return;

    const overColumnId = over.data.current?.columnId as string | undefined;
    const toCol =
      overColumnId ??
      columns.find((col) => board[col.id]?.some((i) => i.id === over.id))?.id;

    if (!toCol) return;

    if (draggedIssue.status === toCol) {
      const columnList = [...(board[toCol] ?? [])];
      const items = columnList.map((i) => i.id);
      const oldIndex = items.indexOf(active.id as string);
      let newIndex = items.indexOf(over.id as string);
      if (newIndex === -1 && String(over.id).startsWith("column-")) {
        newIndex = items.length - 1;
      }
      if (oldIndex === -1 || newIndex === -1) return;
      if (oldIndex === newIndex) return;

      const newOrder = arrayMove(columnList, oldIndex, newIndex);
      const updates = newOrder.map((issue, idx) => ({
        issueId: issue.id,
        kanbanOrder: idx,
      }));

      const snapshot = columnList.map((i) => ({ ...i }));
      const now = new Date();
      newOrder.forEach((issue, idx) => {
        upsertIssue({ ...issue, kanbanOrder: idx, updatedAt: now });
      });

      void reorderKanbanIssues(updates)
        .then((rows) => {
          rows.forEach((row) => {
            patchIssue(row.id, {
              kanbanOrder: row.kanbanOrder,
              updatedAt: row.updatedAt,
            });
          });
        })
        .catch(() => {
          snapshot.forEach((issue) => upsertIssue(issue));
        });
      return;
    }

    const optimistic = {
      ...draggedIssue,
      status: toCol,
      updatedAt: new Date(),
    };
    upsertIssue(optimistic);

    void updateIssueStatus(draggedIssue.id, toCol)
      .then((patch) => patchIssue(draggedIssue.id, patch))
      .catch(() => upsertIssue(draggedIssue));
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-bold text-foreground">Board</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentProject.name}
            {activeSprint ? ` · ${activeSprint.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WorkflowStatusManager projectId={projectId} />
          <button
            onClick={() => openNewIssue()}
            className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium px-3 py-1.5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Issue
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div
            className="flex gap-4 p-6 h-full"
            style={{ minWidth: `${Math.max(columns.length, 1) * 300}px` }}
          >
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                projectId={projectId}
                column={col}
                issues={board[col.id] ?? []}
                onAddIssue={() => openNewIssue({ status: col.id })}
                onOpenIssue={(issue) => setDrawerIssueId(issue.id)}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeIssue && (
            <IssueCard issue={activeIssue} onOpen={() => {}} isDragging />
          )}
        </DragOverlay>
      </DndContext>

      {drawerIssueId && (
        <IssueDrawer
          issueId={drawerIssueId}
          onClose={() => setDrawerIssueId(null)}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  projectId,
  column,
  issues,
  onAddIssue,
  onOpenIssue,
}: {
  projectId: string;
  column: BoardColumn;
  issues: Issue[];
  onAddIssue: () => void;
  onOpenIssue: (issue: Issue) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { columnId: column.id },
  });

  return (
    <div
      className="flex flex-col rounded-xl border bg-muted/30 w-72 shrink-0"
      style={{ borderColor: `${column.color}50` }}
      data-column-id={column.id}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <ProjectStatusBadge projectId={projectId} status={column.id} />
          <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {issues.length}
          </span>
        </div>
        <Tooltip content={`Add issue to ${column.label}`} side="top">
          <button
            type="button"
            onClick={onAddIssue}
            className="rounded-sm p-0.5 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label={`Add issue to ${column.label}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      </div>

      <SortableContext
        items={issues.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[200px] flex flex-col",
            isOver &&
              "bg-primary/6 rounded-lg outline-1 outline-primary/25 -outline-offset-1",
          )}
          data-column-id={column.id}
        >
          {issues.map((issue) => (
            <SortableIssueCard
              key={issue.id}
              issue={issue}
              onOpen={onOpenIssue}
              columnId={column.id}
            />
          ))}
          {issues.length === 0 && (
            <div className="flex flex-1 min-h-[160px] items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-lg pointer-events-none">
              Drop issues here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableIssueCard({
  issue,
  onOpen,
  columnId,
}: {
  issue: Issue;
  onOpen: (i: Issue) => void;
  columnId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    data: { columnId },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-30")}
    >
      <IssueCard
        issue={issue}
        onOpen={onOpen}
        listeners={listeners}
        attributes={attributes}
      />
    </div>
  );
}

function IssueCard({
  issue,
  onOpen,
  listeners,
  attributes,
  isDragging,
}: {
  issue: Issue;
  onOpen: (i: Issue) => void;
  listeners?: ReturnType<typeof useSortable>["listeners"];
  attributes?: ReturnType<typeof useSortable>["attributes"];
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group",
        isDragging && "kanban-card-dragging",
      )}
      onClick={() => onOpen(issue)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <IssueTypeIcon type={issue.type} />
          <span className="text-[10px] font-mono text-muted-foreground">
            {issue.issueKey}
          </span>
          {issue.severity && <SeverityBadge severity={issue.severity} />}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content="Drag to move" side="top">
            <div
              {...listeners}
              {...attributes}
              className="cursor-grab text-muted-foreground hover:text-foreground transition-colors p-0.5"
              onClick={(e) => e.stopPropagation()}
              aria-label="Drag to move"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          </Tooltip>
        </div>
      </div>

      <p className="text-sm font-medium text-foreground mb-2 line-clamp-2 leading-snug">
        {issue.title}
      </p>

      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {issue.labels.slice(0, 2).map((l) => (
            <LabelChip key={l.id} name={l.name} color={l.color} />
          ))}
          {issue.labels.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{issue.labels.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <PriorityIcon priority={issue.priority} />
        <div className="flex items-center gap-2">
          {issue.estimate && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              {issue.estimate}pt
            </span>
          )}
          {issue.comments.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {issue.comments.length}
            </span>
          )}
          {issue.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {issue.attachments.length}
            </span>
          )}
          {issue.assignees.length > 0 && (
            <AvatarGroup users={issue.assignees} max={2} />
          )}
        </div>
      </div>
    </div>
  );
}
