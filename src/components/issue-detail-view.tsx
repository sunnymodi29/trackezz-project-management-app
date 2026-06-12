"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { COMMENT_QUERY_PARAM } from "@/lib/comments/share";
import type { Issue, IssueStatus, Priority } from "@/types";
import { PriorityBadge, IssueTypeIcon, SeverityBadge, LabelChip } from "@/components/ui/issue-badges";
import { ProjectStatusBadge } from "@/components/project-status-badge";
import { workflowStatusSelectOptions } from "@/lib/projects/workflow-status";
import { Avatar, Button, CustomSelect, Tooltip, Skeleton } from "@/components/ui";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { normalizeRichTextForSave } from "@/lib/rich-text";
import { formatRelativeTime } from "@/lib/utils";
import { useDataStore } from "@/store/data-store";
import { projectKeyForId, projectPath, issuePath, getIssueShareUrl } from "@/lib/projects/route";
import { usePersistIssue } from "@/lib/issues/use-persist-issue";
import { deleteIssue } from "@/lib/actions/issues";
import { IssueCommentSection } from "@/components/issue-comment-section";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { countComments } from "@/lib/comments/tree";
import {
  X, ExternalLink, Paperclip, Clock, User, Zap,
  Calendar, Tag, Flag, ChevronRight, Edit2, Copy, Trash2,
  Check, MessageSquare, History, Filter,
} from "lucide-react";
import {
  buildAssigneeFilterOptions,
  issueMatchesAssigneeFilter,
  type AssigneeFilterValue,
} from "@/lib/issues/filters";
import { coerceDate, dateFromKey, toDateKey } from "@/lib/issues/dates";
import { cn } from "@/lib/utils";
import { RichTextContent } from "@/components/ui/rich-text-content";

interface IssueDetailViewProps {
  issueId: string;
  variant?: "drawer" | "page";
  onClose?: () => void;
  onNavigateIssue?: (issueId: string) => void;
  /** Open comments tab and highlight this comment (from ?comment= URL). */
  highlightCommentId?: string;
  className?: string;
}

function IssueDetailViewInner({
  issueId,
  variant = "drawer",
  onClose,
  onNavigateIssue,
  highlightCommentId: highlightCommentIdProp,
  className,
}: IssueDetailViewProps) {
  const searchParams = useSearchParams();
  const highlightCommentId =
    highlightCommentIdProp ??
    searchParams.get(COMMENT_QUERY_PARAM) ??
    undefined;
  const router = useRouter();
  const issues = useDataStore((s) => s.issues);
  const hydrated = useDataStore((s) => s.hydrated);
  const issue = issues.find((i) => i.id === issueId);
  const {
    currentUser,
    getProjectMembers,
    getWorkflowStatuses,
    projects,
    sprints,
    getActivityLogsForIssue,
  } = useDataStore();
  const upsertIssue = useDataStore((s) => s.upsertIssue);
  const removeIssue = useDataStore((s) => s.removeIssue);
  const { persist, saving, error } = usePersistIssue();
  const [linkCopied, setLinkCopied] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const users = issue
    ? getProjectMembers(issue.projectId).map((m) => m.user)
    : [];
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilterValue>("all");

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(issue?.title ?? "");
  const [description, setDescription] = useState(issue?.description ?? "");

  const activityLogs = useMemo(
    () => (issue ? getActivityLogsForIssue(issue.id) : []),
    [issue, getActivityLogsForIssue]
  );

  const assigneeFilterOptions = useMemo(
    () => buildAssigneeFilterOptions(users),
    [users],
  );

  const statusOptions = useMemo(
    () =>
      issue
        ? workflowStatusSelectOptions(getWorkflowStatuses(issue.projectId))
        : [],
    [issue, getWorkflowStatuses],
  );

  const projectIssues = useMemo(
    () =>
      issue
        ? issues.filter((i) => i.projectId === issue.projectId)
        : [],
    [issues, issue?.projectId],
  );

  const filteredProjectIssues = useMemo(
    () =>
      issue
        ? projectIssues
            .filter(
              (i) =>
                i.id !== issue.id && issueMatchesAssigneeFilter(i, assigneeFilter),
            )
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 12)
        : [],
    [projectIssues, issue, assigneeFilter],
  );

  useEffect(() => {
    if (!issue) return;
    setTitle(issue.title);
    setDescription(issue.description ?? "");
    setAssigneeFilter("all");
  }, [issue]);

  useEffect(() => {
    if (highlightCommentId) setActiveTab("comments");
  }, [highlightCommentId, issueId]);

  if (!issue) {
    if (!hydrated) {
      return (
        <div className={cn("flex flex-col h-full bg-card p-6 space-y-4", className)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      );
    }
    return (
      <div className={cn("flex flex-col h-full bg-card p-6", className)}>
        <p className="text-sm text-muted-foreground">Issue not found.</p>
        {onClose && (
          <Button size="sm" variant="ghost" className="mt-4" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    );
  }

  const handleFieldUpdate = async (input: Parameters<typeof persist>[1]) => {
    const updated = await persist(issue.id, input);
    if (!updated) return;
    if (input.title !== undefined) setTitle(updated.title);
    if (input.description !== undefined) setDescription(updated.description ?? "");
  };

  const commentCount = countComments(issue.comments);
  const projectKey = projectKeyForId(projects, issue.projectId);
  const fullPageHref = issuePath(projectKey, issue.id);

  const handleCopyLink = async () => {
    const url = getIssueShareUrl(window.location.origin, projectKey, issue.id);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      console.error("Failed to copy link");
    }
  };

  const handleDeleteIssue = async () => {
    setDeleting(true);
    try {
      const { projectKey: key } = await deleteIssue(issue.id);
      removeIssue(issue.id);
      setDeleteConfirmOpen(false);
      onClose?.();
      router.push(projectPath(key, "/issues"));
      router.refresh();
    } catch (e) {
      console.error(e instanceof Error ? e.message : "Failed to delete issue");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card overflow-hidden",
        variant === "drawer" && "animate-slide-right border-l border-border",
        className
      )}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <IssueTypeIcon type={issue.type} />
          <span className="text-xs font-mono text-muted-foreground">{issue.issueKey}</span>
          {issue.severity && <SeverityBadge severity={issue.severity} />}
          {saving && (
            <span className="text-[10px] text-muted-foreground animate-pulse">Saving…</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip content={linkCopied ? "Copied!" : "Copy shareable link"} side="bottom">
            <button
              className={cn("rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground", linkCopied && "p-0 hover:bg-transparent")}
              aria-label="Copy shareable link"
              onClick={() => void handleCopyLink()}
            >
              {linkCopied ? <Check className="h-3.5 w-3.5 " /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </Tooltip>
          {linkCopied && (
            <span className="text-[10px] text-primary font-medium">Copied!</span>
          )}
          {variant === "drawer" && (
            <Tooltip content="Open full page" side="bottom">
              <Link
                href={fullPageHref}
                className="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground"
                aria-label="Open full page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Tooltip>
          )}
          <Tooltip content="Delete issue" side="bottom">
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
              className="rounded-md p-1.5 hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
              aria-label="Delete issue"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip content={isEditing ? "Stop editing" : "Edit issue"} side="bottom">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                isEditing ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
              )}
              aria-label="Edit issue"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          {onClose && (
            <Tooltip content="Close" side="bottom">
              <button
                onClick={onClose}
                className="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {error && (
        <div className="px-5 py-2 text-xs text-destructive bg-destructive/10 border-b border-destructive/20">
          {error}
        </div>
      )}

      <div className={cn("flex-1 min-h-0 flex flex-col", activeTab === "comments" ? "overflow-hidden" : "overflow-y-auto")}>
        <div className={cn("flex-1 min-h-0", activeTab === "comments" ? "overflow-y-auto" : "")}>
        <div className="px-5 py-4 border-b border-border">
          {isEditing ? (
            <div className="space-y-4 animate-fade-in">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-base font-semibold text-foreground outline-none border-b border-primary/30 pb-1"
                placeholder="Issue title"
              />
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Issue description"
                minHeight="120px"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setIsEditing(false);
                    setTitle(issue.title);
                    setDescription(issue.description ?? "");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={saving || !title.trim()}
                  onClick={async () => {
                    await handleFieldUpdate({
                      title: title.trim(),
                      description: normalizeRichTextForSave(description) ?? "",
                    });
                    setIsEditing(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-foreground leading-snug mb-3">{issue.title}</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                <CustomSelect
                  options={statusOptions}
                  value={issue.status}
                  onChange={(val) => void handleFieldUpdate({ status: val as IssueStatus })}
                  renderTrigger={() => (
                    <ProjectStatusBadge
                      projectId={issue.projectId}
                      status={issue.status}
                      className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                    />
                  )}
                  className="w-auto"
                />
                <CustomSelect
                  options={[
                    { value: "urgent", label: "Urgent" },
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                    { value: "none", label: "No Priority" },
                  ]}
                  value={issue.priority}
                  onChange={(val) => void handleFieldUpdate({ priority: val as Priority })}
                  renderTrigger={() => <PriorityBadge priority={issue.priority} className="cursor-pointer px-2 py-0.5 rounded hover:bg-accent/50 transition-all" />}
                  className="w-auto"
                />
              </div>
              {issue.description && (
                <RichTextContent content={issue.description} />
              )}
            </>
          )}
        </div>

        {(issue.reproductionSteps || issue.expectedResult || issue.actualResult) && (
          <div className="px-5 py-4 border-b border-border space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bug Details</div>
            {issue.environment && <Field label="Environment" value={issue.environment} mono />}
            {issue.reproductionSteps && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Reproduction Steps</div>
                <pre className="text-xs text-foreground bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {issue.reproductionSteps}
                </pre>
              </div>
            )}
            {issue.expectedResult && <Field label="Expected Result" value={issue.expectedResult} />}
            {issue.actualResult && <Field label="Actual Result" value={issue.actualResult} className="text-red-400" />}
          </div>
        )}

        <div className="px-5 py-4 border-b border-border">
          <div className="grid grid-cols-2 gap-3">
            <MetaRow label="Assignees" icon={<User className="h-3.5 w-3.5" />}>
              <CustomSelect
                multiple
                options={users.map((u) => ({ value: u.id, label: u.name, avatarUrl: u.avatarUrl }))}
                value={issue.assigneeIds}
                onChange={(values) => void handleFieldUpdate({ assigneeIds: values })}
                placeholder="Unassigned"
                className="w-full"
                renderTrigger={(selected) => {
                  const selectedList = Array.isArray(selected) ? selected : [];
                  return selectedList.length > 0 ? (
                    <div className="flex flex-wrap gap-1 p-1 rounded hover:bg-accent transition-colors cursor-pointer min-h-[28px] w-full">
                      {selectedList.map((o) => (
                        <div key={o.value} className="flex items-center gap-1.5 bg-muted rounded-full pr-2">
                          {o.avatarUrl && <Avatar src={o.avatarUrl} name={o.label} size="xs" />}
                          <span className="text-[10px] font-medium">{o.label.split(" ")[0]}</span>
                        </div>
                      ))}
                      <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto self-center" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 p-1 rounded hover:bg-accent transition-colors cursor-pointer text-muted-foreground w-full">
                      <div className="h-5 w-5 rounded-full border border-dashed border-border flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                      <span className="text-xs italic">Unassigned</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
                    </div>
                  );
                }}
              />
            </MetaRow>
            <MetaRow label="Reporter" icon={<User className="h-3.5 w-3.5" />}>
              {issue.reporter && (
                <div className="flex items-center gap-1.5">
                  <Avatar src={issue.reporter.avatarUrl} name={issue.reporter.name} size="xs" />
                  <span className="text-xs text-foreground">{issue.reporter.name}</span>
                </div>
              )}
            </MetaRow>
            <MetaRow label="Sprint" icon={<Flag className="h-3.5 w-3.5" />}>
              <CustomSelect
                options={[
                  { value: "", label: "No Sprint" },
                  ...sprints
                    .filter((s) => s.projectId === issue.projectId)
                    .map((s) => ({
                      value: s.id,
                      label: `${s.name} (${s.status})`,
                    })),
                ]}
                value={issue.sprintId ?? ""}
                onChange={(value) => {
                  const sprintId = typeof value === "string" && value ? value : null;
                  void handleFieldUpdate({ sprintId });
                }}
                placeholder="No Sprint"
                className="w-full"
              />
            </MetaRow>
            <MetaRow label="Epic" icon={<Zap className="h-3.5 w-3.5" />}>
              {issue.epic ? (
                <span className="text-xs" style={{ color: issue.epic.color }}>{issue.epic.name}</span>
              ) : (
                <span className="text-xs text-muted-foreground">No Epic</span>
              )}
            </MetaRow>
            <MetaRow label="Estimate" icon={<Clock className="h-3.5 w-3.5" />}>
              <span className="text-xs text-foreground">{issue.estimate ? `${issue.estimate} pts` : "—"}</span>
            </MetaRow>
            <MetaRow label="Due Date" icon={<Calendar className="h-3.5 w-3.5" />}>
              <input
                type="date"
                disabled={saving}
                value={(() => {
                  const d = coerceDate(issue.dueDate);
                  return d ? toDateKey(d) : "";
                })()}
                onChange={(e) => {
                  const v = e.target.value;
                  void persist(issue.id, {
                    dueDate: v ? dateFromKey(v) : null,
                  });
                }}
                className="text-xs text-foreground bg-transparent border-0 outline-none cursor-pointer"
              />
            </MetaRow>
          </div>

          {issue.labels.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Labels
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((l) => (
                  <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}
              </div>
            </div>
          )}
        </div>

        {issue.attachments.length > 0 && (
          <div className="px-5 py-4 border-b border-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Attachments ({issue.attachments.length})
            </div>
            <div className="space-y-2">
              {issue.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{att.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {(att.size / 1024).toFixed(0)} KB · {formatRelativeTime(att.createdAt)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {projectIssues.length > 1 && (
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Filter className="h-3 w-3" />
                Project issues
              </div>
              <CustomSelect
                options={assigneeFilterOptions}
                value={assigneeFilter}
                onChange={(v) => setAssigneeFilter(v as AssigneeFilterValue)}
                placeholder="Assignee"
                className="w-40"
                triggerClassName="h-8 text-xs"
              />
            </div>
            {filteredProjectIssues.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No other issues match this assignee filter.
              </p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {filteredProjectIssues.map((item) => (
                  <li key={item.id}>
                    {variant === "drawer" && onNavigateIssue ? (
                      <button
                        type="button"
                        onClick={() => onNavigateIssue(item.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent transition-colors"
                      >
                        <IssueTypeIcon type={item.type} />
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {item.issueKey}
                        </span>
                        <span className="flex-1 min-w-0 text-xs truncate">{item.title}</span>
                        <ProjectStatusBadge projectId={issue.projectId} status={item.status} />
                      </button>
                    ) : (
                      <Link
                        href={issuePath(projectKey, item.id)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
                      >
                        <IssueTypeIcon type={item.type} />
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {item.issueKey}
                        </span>
                        <span className="flex-1 min-w-0 text-xs truncate">{item.title}</span>
                        <ProjectStatusBadge projectId={issue.projectId} status={item.status} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {assigneeFilter === "all" && issue.assigneeIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {issue.assignees.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAssigneeFilter(a.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Avatar src={a.avatarUrl} name={a.name} size="xs" />
                    {a.name.split(" ")[0]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAssigneeFilter("unassigned")}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  Unassigned
                </button>
              </div>
            )}
          </div>
        )}

        <div className={cn("pt-4 flex flex-col", activeTab === "comments" && "flex-1 min-h-0")}>
          <div className="flex gap-2 border-b border-border mb-2 px-5 shrink-0">
            {(
              [
                { id: "comments" as const, label: "Comments", icon: MessageSquare },
                { id: "activity" as const, label: "Activity", icon: History },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors cursor-pointer rounded-t-md",
                  activeTab === id
                    ? "z-10 bg-card text-primary shadow-[inset_0_-2px_0_0_var(--color-primary)]"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
                {id === "comments" && commentCount > 0 && (
                  <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5">
                    {commentCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeTab === "comments" && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <IssueCommentSection
                issue={issue}
                currentUser={currentUser}
                projectKey={projectKey}
                highlightCommentId={highlightCommentId}
                onIssueUpdate={(updated) => {
                  upsertIssue(updated);
                  router.refresh();
                }}
              />
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-3 pb-4 px-5">
              {activityLogs.length === 0 && (
                <div className="text-xs text-muted-foreground italic py-4">No activity recorded yet.</div>
              )}
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <Avatar src={log.user.avatarUrl} name={log.user.name} size="xs" />
                  <div className="flex-1">
                    <span className="text-xs text-foreground font-medium">{log.user.name}</span>
                    <span className="text-xs text-muted-foreground"> {log.action}</span>
                    <div className="text-xs text-foreground mt-0.5">{log.details}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatRelativeTime(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Delete ${issue.issueKey}?`}
        description="This issue and its comments will be permanently removed. This cannot be undone."
        confirmLabel="Delete issue"
        variant="destructive"
        loading={deleting}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        onConfirm={() => void handleDeleteIssue()}
      />
    </div>
  );
}

export function IssueDetailView(props: IssueDetailViewProps) {
  return (
    <Suspense fallback={null}>
      <IssueDetailViewInner {...props} />
    </Suspense>
  );
}

function Field({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <p className={cn("text-xs text-foreground", mono && "font-mono bg-muted rounded px-2 py-1", className)}>{value}</p>
    </div>
  );
}

function MetaRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}
