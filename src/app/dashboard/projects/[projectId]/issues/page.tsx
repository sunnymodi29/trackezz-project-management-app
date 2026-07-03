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
  issueMatchesAssigneeFilter,
  type AssigneeFilterValue,
} from "@/lib/issues/filters";
import { useProjectAssigneeSelect } from "@/hooks/use-project-assignee-select";
import { Search, Plus, ChevronDown } from "lucide-react";
import IssueDrawer from "@/components/issue-drawer";
import type { Issue } from "@/types";
import { DashboardLink } from "@/components/dashboard-link";
import {
  buildIssueTreeForStatusColumn,
  expandIssuesWithAncestors,
  flattenIssueTree,
  type IssueTreeNode,
} from "@/lib/issues/tree";
import { IssueTreeList } from "@/components/issue-tree-list";

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
  const { projects, getIssuesByProject, getWorkflowStatuses } = useDataStore();
  const { persist } = usePersistIssue();

  const routeParam = params.projectId as string;
  const project = resolveProjectFromParam(projects, routeParam) ?? projects[0];
  const { assigneeFilterOptions } = useProjectAssigneeSelect(project?.id);
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

  useEffect(() => {
    const issueParam = searchParams.get("issue");
    if (!issueParam) return;
    const match =
      projectIssues.find((i) => i.id === issueParam) ??
      projectIssues.find((i) => i.issueKey === issueParam);
    if (match) setSelectedIssueId(match.id);
  }, [searchParams, projectIssues]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    assigneeFilter !== "all";

  const filtered = useMemo(() => {
    const matched = projectIssues.filter((i) => {
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
    });

    const withContext = hasActiveFilters
      ? expandIssuesWithAncestors(
          projectIssues,
          new Set(matched.map((i) => i.id)),
        )
      : matched;

    return [...withContext].sort((a, b) => {
      if (sortBy === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
        return (order[a.priority] ?? 5) - (order[b.priority] ?? 5);
      }
      if (sortBy === "created")
        return b.createdAt.getTime() - a.createdAt.getTime();
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }, [
    projectIssues,
    search,
    typeFilter,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    sortBy,
    hasActiveFilters,
  ]);

  const grouped = useMemo(() => {
    const extraStatuses = [...new Set(filtered.map((i) => i.status))].filter(
      (k) => !statusOptions.some((o) => o.value === k),
    );
    const orderedKeys = [
      ...statusOptions.map((o) => o.value),
      ...extraStatuses,
    ];
    return orderedKeys
      .map((k) => [k, buildIssueTreeForStatusColumn(filtered, k)] as const)
      .filter(([, tree]) => tree.length > 0);
  }, [filtered, statusOptions]);

  const handleIssueFieldChange = async (
    issue: Issue,
    input: { status?: IssueStatus; priority?: Priority },
  ) => {
    await persist(issue.id, input);
  };

  return (
    <div className="flex h-[calc(100dvh-56px)] min-w-0 overflow-x-hidden">
      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col overflow-hidden",
          selectedIssueId && "md:border-r md:border-border",
        )}
      >
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground">Issues</h1>
              <p className="text-xs text-muted-foreground">
                {filteredIssueCount(filtered, projectIssues)} issues
                {project ? ` · ${project.name}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter issues..."
                className="pl-8 sm:h-8 sm:w-52 sm:text-xs"
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="sticky top-0 z-10 hidden items-center gap-2 border-b border-border bg-muted/60 px-6 py-2 text-xs font-medium text-muted-foreground backdrop-blur sm:flex">
            <div className="w-6" />
            <div className="w-20">ID</div>
            <div className="flex-1">Title</div>
            <div className="w-28 hidden md:block">Status</div>
            <div className="w-24 hidden lg:block">Priority</div>
            <div className="w-24 hidden xl:block">Assignee</div>
            <div className="w-20 hidden xl:block">Updated</div>
          </div>

          {grouped.map(([status, tree]) => (
            <IssueGroup
              key={status}
              projectId={project?.id ?? ""}
              status={status}
              tree={tree}
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
      className="w-full min-w-0 sm:w-auto sm:min-w-[125px]"
      triggerClassName="border-border bg-card/40 hover:bg-accent/40 font-medium px-3 sm:h-8 sm:text-xs"
      optionsClassName="w-36"
    />
  );
}

function IssueGroup({
  projectId,
  status,
  tree,
  statusOptions,
  projectKey,
  onSelect,
  selectedId,
  onFieldChange,
}: {
  projectId: string;
  status: string;
  tree: IssueTreeNode[];
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
  const rowCount = useMemo(
    () => flattenIssueTree(tree, new Set()).length,
    [tree],
  );
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors text-left sm:px-6"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            !open && "-rotate-90",
          )}
        />
        <ProjectStatusBadge projectId={projectId} status={status} />
        <span className="text-xs text-muted-foreground">{rowCount}</span>
      </button>

      {open && (
        <IssueTreeList
          tree={tree}
          renderRow={({ node, depth, expandControl }) => {
            const issue = node.issue;
            return (
              <div
                onClick={() => onSelect(issue.id)}
                className={cn(
                  "group flex min-w-0 items-start gap-2 border-b border-border/50 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors sm:items-center sm:px-6 sm:py-2.5",
                  selectedId === issue.id &&
                    "bg-primary/5 border-l-2 border-l-primary",
                )}
              >
                <div className="w-6 flex justify-center shrink-0">
                  <IssueTypeIcon type={issue.type} />
                </div>
                <div className="w-16 shrink-0 sm:w-20">
                  <DashboardLink
                    href={issuePath(projectKey, issue.id)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[15px] font-mono text-muted-foreground group-hover:text-primary hover:underline transition-colors">
                      {issue.issueKey}
                    </span>
                  </DashboardLink>
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div
                    className="flex min-w-0 items-center gap-1.5"
                    style={{ paddingLeft: `${depth * 16}px` }}
                  >
                    <div
                      className="shrink-0 flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {expandControl}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <span className="text-sm font-medium text-foreground transition-colors line-clamp-1">
                        {issue.title}
                      </span>
                      {issue.labels.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {issue.labels.slice(0, 2).map((l) => (
                            <LabelChip
                              key={l.id}
                              name={l.name}
                              color={l.color}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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
            );
          }}
        />
      )}
    </div>
  );
}
