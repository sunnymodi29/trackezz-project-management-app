"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { issuePath, resolveProjectFromParam } from "@/lib/projects/route";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { usePersistIssue } from "@/lib/issues/use-persist-issue";
import {
  PriorityBadge,
  IssueTypeIcon,
  LabelChip,
} from "@/components/ui/issue-badges";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { WorkflowStatusManager } from "@/components/workflow-status-manager";
import { workflowStatusSelectOptions } from "@/lib/projects/workflow-status";
import {
  Avatar,
  AvatarGroup,
  Button,
  Input,
  CustomSelect,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { IssueType, IssueStatus, Priority } from "@/types";
import {
  buildAssigneeFilterOptions,
  issueMatchesAssigneeFilter,
  type AssigneeFilterValue,
} from "@/lib/issues/filters";
import { Search, Plus, ChevronDown, MoreHorizontal } from "lucide-react";
import IssueDrawer from "@/components/issue-drawer";
import type { Issue } from "@/types";
import Link from "next/link";

export default function IssuesPage() {
  return (
    <Suspense fallback={<div className="h-[calc(100vh-56px)] bg-background" />}>
      <IssuesPageContent />
    </Suspense>
  );
}

function IssuesPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { openNewIssue } = useAppStore();
  const {
    projects,
    getIssuesByProject,
    getProjectMembers,
    getWorkflowStatuses,
  } = useDataStore();
  const { persist } = usePersistIssue();

  const routeParam = params.projectId as string;
  const project = resolveProjectFromParam(projects, routeParam) ?? projects[0];
  const projectKey = project?.key ?? "";
  const projectIssues = getIssuesByProject(project?.id ?? "");
  const workflowStatuses = project ? getWorkflowStatuses(project.id) : [];
  const statusOptions = useMemo(
    () => workflowStatusSelectOptions(workflowStatuses),
    [workflowStatuses],
  );

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<IssueType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [assigneeFilter, setAssigneeFilter] =
    useState<AssigneeFilterValue>("all");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "priority">(
    "updated",
  );

  const assigneeFilterOptions = useMemo(
    () =>
      buildAssigneeFilterOptions(
        project ? getProjectMembers(project.id).map((m) => m.user) : [],
      ),
    [project, getProjectMembers],
  );

  useEffect(() => {
    const issueParam = searchParams.get("issue");
    if (!issueParam) return;
    const match =
      projectIssues.find((i) => i.id === issueParam) ??
      projectIssues.find((i) => i.issueKey === issueParam);
    if (match) setSelectedIssueId(match.id);
  }, [searchParams, projectIssues]);

  const filtered = useMemo(
    () =>
      projectIssues
        .filter((i) => {
          if (
            search &&
            !i.title.toLowerCase().includes(search.toLowerCase()) &&
            !i.issueKey.toLowerCase().includes(search.toLowerCase())
          )
            return false;
          if (typeFilter !== "all" && i.type !== typeFilter) return false;
          if (statusFilter !== "all" && i.status !== statusFilter) return false;
          if (priorityFilter !== "all" && i.priority !== priorityFilter)
            return false;
          if (!issueMatchesAssigneeFilter(i, assigneeFilter)) return false;
          return true;
        })
        .sort((a, b) => {
          if (sortBy === "priority") {
            const order = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
            return (order[a.priority] ?? 5) - (order[b.priority] ?? 5);
          }
          if (sortBy === "created")
            return b.createdAt.getTime() - a.createdAt.getTime();
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }),
    [
      projectIssues,
      search,
      typeFilter,
      statusFilter,
      priorityFilter,
      assigneeFilter,
      sortBy,
    ],
  );

  const grouped = useMemo(() => {
    const map = filtered.reduce<Record<string, Issue[]>>((acc, issue) => {
      const key = issue.status;
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    }, {});
    const orderedKeys = [
      ...statusOptions.map((o) => o.value),
      ...Object.keys(map).filter(
        (k) => !statusOptions.some((o) => o.value === k),
      ),
    ];
    return orderedKeys
      .filter((k) => map[k]?.length)
      .map((k) => [k, map[k]!] as const);
  }, [filtered, statusOptions]);

  const handleIssueFieldChange = async (
    issue: Issue,
    input: { status?: IssueStatus; priority?: Priority },
  ) => {
    await persist(issue.id, input);
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden",
          selectedIssueId && "border-r border-border",
        )}
      >
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-foreground">Issues</h1>
              <p className="text-xs text-muted-foreground">
                {filteredIssueCount(filtered, projectIssues)} issues
                {project ? ` · ${project.name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {project && <WorkflowStatusManager projectId={project.id} />}
              <Button
                size="sm"
                onClick={() => openNewIssue()}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> New Issue
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter issues..."
                className="pl-8 h-8 w-52 text-xs"
              />
            </div>
            <FilterSelect
              label="Type"
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as IssueType | "all")}
              options={[
                { value: "all", label: "All Types" },
                { value: "task", label: "Task" },
                { value: "bug", label: "Bug" },
                { value: "feature", label: "Feature" },
                { value: "improvement", label: "Improvement" },
              ]}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as IssueStatus | "all")}
              options={[
                { value: "all", label: "All Status" },
                ...statusOptions,
              ]}
            />
            <FilterSelect
              label="Priority"
              value={priorityFilter}
              onChange={(v) => setPriorityFilter(v as Priority | "all")}
              options={[
                { value: "all", label: "All Priority" },
                { value: "urgent", label: "Urgent" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            />
            <FilterSelect
              label="Assignee"
              value={assigneeFilter}
              onChange={(v) => setAssigneeFilter(v as AssigneeFilterValue)}
              options={assigneeFilterOptions}
            />
            <FilterSelect
              label="Sort"
              value={sortBy}
              onChange={(v) =>
                setSortBy(v as "updated" | "created" | "priority")
              }
              options={[
                { value: "updated", label: "Last Updated" },
                { value: "created", label: "Created" },
                { value: "priority", label: "Priority" },
              ]}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center gap-2 px-6 py-2 bg-muted/60 backdrop-blur border-b border-border text-xs font-medium text-muted-foreground">
            <div className="w-6" />
            <div className="w-20">ID</div>
            <div className="flex-1">Title</div>
            <div className="w-28 hidden md:block">Status</div>
            <div className="w-24 hidden lg:block">Priority</div>
            <div className="w-24 hidden xl:block">Assignee</div>
            <div className="w-20 hidden xl:block">Updated</div>
          </div>

          {grouped.map(([status, issues]) => (
            <IssueGroup
              key={status}
              projectId={project?.id ?? ""}
              status={status}
              issues={issues}
              statusOptions={statusOptions}
              projectKey={projectKey}
              onSelect={setSelectedIssueId}
              selectedId={selectedIssueId ?? undefined}
              onFieldChange={handleIssueFieldChange}
            />
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Search className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No issues found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {selectedIssueId && (
        <IssueDrawer
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          onNavigateIssue={setSelectedIssueId}
        />
      )}
    </div>
  );
}

function filteredIssueCount(filtered: Issue[], all: Issue[]) {
  if (filtered.length === all.length) return `${all.length}`;
  return `${filtered.length} of ${all.length}`;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <CustomSelect
      options={options}
      value={value}
      onChange={onChange}
      className="w-auto min-w-[125px]"
      triggerClassName="h-8 border-border bg-card/40 hover:bg-accent/40 font-medium px-3 text-xs"
      optionsClassName="w-36"
    />
  );
}

function IssueGroup({
  projectId,
  status,
  issues,
  statusOptions,
  projectKey,
  onSelect,
  selectedId,
  onFieldChange,
}: {
  projectId: string;
  status: string;
  issues: Issue[];
  statusOptions: { value: string; label: string }[];
  projectKey: string;
  onSelect: (id: string) => void;
  selectedId?: string;
  onFieldChange: (
    issue: Issue,
    input: { status?: IssueStatus; priority?: Priority },
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-6 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            !open && "-rotate-90",
          )}
        />
        <ProjectStatusBadge projectId={projectId} status={status} />
        <span className="text-xs text-muted-foreground">{issues.length}</span>
      </button>

      {open &&
        issues.map((issue) => (
          <div
            key={issue.id}
            onClick={() => onSelect(issue.id)}
            className={cn(
              "group flex items-center gap-2 px-6 py-2.5 hover:bg-accent/50 cursor-pointer border-b border-border/50 transition-colors",
              selectedId === issue.id &&
                "bg-primary/5 border-l-2 border-l-primary",
            )}
          >
            <div className="w-6 flex justify-center shrink-0">
              <IssueTypeIcon type={issue.type} />
            </div>
            <div className="w-20 shrink-0">
              <Link
                href={issuePath(projectKey, issue.id)}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] font-mono text-muted-foreground group-hover:text-primary hover:underline transition-colors">
                  {issue.issueKey}
                </span>
              </Link>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                {issue.title}
              </span>
              {issue.labels.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {issue.labels.slice(0, 2).map((l) => (
                    <LabelChip key={l.id} name={l.name} color={l.color} />
                  ))}
                </div>
              )}
            </div>
            <div
              className="w-28 hidden md:block shrink-0 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <CustomSelect
                options={statusOptions}
                value={issue.status}
                onChange={(val) =>
                  void onFieldChange(issue, { status: val as IssueStatus })
                }
                renderTrigger={() => (
                  <ProjectStatusBadge
                    projectId={projectId}
                    status={issue.status}
                    className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                  />
                )}
              />
            </div>
            <div
              className="w-24 hidden lg:block shrink-0 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <CustomSelect
                options={[
                  { value: "urgent", label: "Urgent" },
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                  { value: "none", label: "No Priority" },
                ]}
                value={issue.priority}
                onChange={(val) =>
                  void onFieldChange(issue, { priority: val as Priority })
                }
                renderTrigger={() => (
                  <PriorityBadge
                    priority={issue.priority}
                    className="p-1 rounded cursor-pointer hover:bg-accent/50 transition-all"
                  />
                )}
              />
            </div>
            <div className="w-24 hidden xl:flex items-center gap-1.5 shrink-0">
              {issue.assignees.length > 0 ? (
                <AvatarGroup users={issue.assignees} max={2} />
              ) : (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Unassigned
                </span>
              )}
            </div>
            <div className="w-20 hidden xl:block shrink-0">
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(issue.updatedAt)}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}
