"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { createIssue } from "@/lib/actions/issues";
import { useRouter } from "next/navigation";
import { DashboardLink } from "@/components/dashboard-link";
import {
  X,
  Bug,
  Zap,
  Star,
  CheckCircle2,
  Layers,
  BookOpen,
  ChevronDown,
  Paperclip,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Textarea,
  Input,
  CustomSelect,
  DatePicker,
  Avatar,
} from "@/components/ui";
import { useProjectAssigneeSelect } from "@/hooks/use-project-assignee-select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { normalizeRichTextForSave } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import {
  previewNextIssueKey,
  parseIssueNumberFromKey,
} from "@/lib/issues/issue-key";
import { issuePath } from "@/lib/projects/route";
import { dateFromKey, toDateKey } from "@/lib/issues/dates";
import { workflowStatusSelectOptions } from "@/lib/projects/workflow-status";
import type { IssueType, Priority, IssueStatus } from "@/types";

const TYPE_OPTIONS: {
  value: IssueType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "task",
    label: "Task",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />,
  },
  {
    value: "bug",
    label: "Bug",
    icon: <Bug className="h-3.5 w-3.5 text-red-400" />,
  },
  {
    value: "feature",
    label: "Feature",
    icon: <Star className="h-3.5 w-3.5 text-purple-400" />,
  },
  {
    value: "improvement",
    label: "Improvement",
    icon: <Zap className="h-3.5 w-3.5 text-teal-400" />,
  },
  {
    value: "epic",
    label: "Epic",
    icon: <Layers className="h-3.5 w-3.5 text-amber-400" />,
  },
  {
    value: "story",
    label: "Story",
    icon: <BookOpen className="h-3.5 w-3.5 text-green-400" />,
  },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🔵 Low" },
  { value: "none", label: "⚪ No Priority" },
];

export function NewIssueModal() {
  const {
    newIssueModalOpen,
    closeNewIssue,
    currentProject,
    setCurrentProject,
    newIssueDefaultDueDate,
    newIssueDefaultStatus,
    newIssueDefaultParentId,
  } = useAppStore();
  const router = useRouter();
  const {
    projects,
    currentUser,
    getWorkflowStatuses,
    upsertIssue,
    patchProject,
    issues,
  } = useDataStore();
  const { assigneeOptions, getSelectedAssignees } = useProjectAssigneeSelect(
    currentProject.id,
  );
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<IssueType>("task");
  const [title, setTitle] = useState("");
  const [description, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<IssueStatus>("todo");
  const [estimate, setEstimate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const selectedAssignees = getSelectedAssignees(assigneeIds);
  const statusOptions = workflowStatusSelectOptions(
    getWorkflowStatuses(currentProject.id),
  );
  const [showBugFields, setShowBugFields] = useState(false);
  const [reproSteps, setReproSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [env, setEnv] = useState("");
  const [dueDate, setDueDate] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  type SimilarRow = {
    id: string;
    issueKey: string;
    title: string;
    status: string;
    score: number;
    match: string;
  };
  const [similar, setSimilar] = useState<SimilarRow[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageSuggestion, setTriageSuggestion] = useState<{
    type: IssueType;
    status: IssueStatus;
    priority: Priority;
    rationale: string;
  } | null>(null);

  const parentIssueForCreate = useMemo(
    () =>
      newIssueDefaultParentId
        ? issues.find((i) => i.id === newIssueDefaultParentId)
        : undefined,
    [issues, newIssueDefaultParentId],
  );

  useEffect(() => {
    if (newIssueModalOpen) {
      setDueDate(
        newIssueDefaultDueDate ? toDateKey(newIssueDefaultDueDate) : "",
      );
      const statuses = getWorkflowStatuses(currentProject.id);
      const defaultStatus =
        statuses.find((s) => s.key === "todo")?.key ??
        statuses[0]?.key ??
        "todo";
      setStatus(newIssueDefaultStatus ?? defaultStatus);
      setTimeout(() => titleRef.current?.focus(), 50);
      setSimilar([]);
      setTriageSuggestion(null);
    }
  }, [
    newIssueModalOpen,
    newIssueDefaultDueDate,
    newIssueDefaultStatus,
    currentProject.id,
    getWorkflowStatuses,
  ]);

  useEffect(() => {
    setShowBugFields(type === "bug");
  }, [type]);

  useEffect(() => {
    if (!newIssueModalOpen || !currentProject.id) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        const draftTitle = title.trim();
        const draftDesc = normalizeRichTextForSave(description);
        if (!draftTitle && !draftDesc) {
          setSimilar([]);
          return;
        }
        setSimilarLoading(true);
        try {
          const res = await fetch("/api/ai/similar-issues", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: currentProject.id,
              title: draftTitle || "(no title)",
              description: draftDesc,
            }),
          });
          const json = (await res.json()) as {
            data?: { similar?: SimilarRow[] };
          };
          if (res.ok) setSimilar(json.data?.similar ?? []);
          else setSimilar([]);
        } catch {
          setSimilar([]);
        } finally {
          setSimilarLoading(false);
        }
      })();
    }, 450);
    return () => window.clearTimeout(handle);
  }, [newIssueModalOpen, currentProject.id, title, description]);

  const runTriageSuggestion = async () => {
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    setTriageLoading(true);
    try {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProject.id,
          title,
          description: normalizeRichTextForSave(description),
        }),
      });
      const json = (await res.json()) as {
        data?: {
          suggestion: {
            type: IssueType;
            status: IssueStatus;
            priority: Priority;
            rationale: string;
          };
        };
      };
      if (res.ok && json.data?.suggestion) setTriageSuggestion(json.data.suggestion);
    } finally {
      setTriageLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNewIssue();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeNewIssue]);

  if (!newIssueModalOpen) return null;

  const nextIssueKeyPreview = previewNextIssueKey(
    currentProject.key,
    currentProject.issueCounter ?? 0,
  );

  const handleSubmit = async () => {
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const issue = await createIssue({
        projectId: currentProject.id,
        title,
        description: normalizeRichTextForSave(description),
        type,
        status,
        priority,
        estimate: estimate ? parseInt(estimate, 10) : undefined,
        assigneeIds,
        reporterId: currentUser.id,
        reproductionSteps: reproSteps || undefined,
        expectedResult: expected || undefined,
        actualResult: actual || undefined,
        environment: env || undefined,
        dueDate: dueDate ? dateFromKey(dueDate) : undefined,
        parentId: newIssueDefaultParentId ?? undefined,
      });
      upsertIssue(issue);
      const issueNumber = parseIssueNumberFromKey(issue.issueKey);
      if (issueNumber !== null) {
        patchProject(currentProject.id, {
          issueCounter: issueNumber,
          issueCount: (currentProject.issueCount ?? 0) + 1,
        });
      }
      router.refresh();
      closeNewIssue();
      setTitle("");
      setDesc("");
      setSimilar([]);
      setTriageSuggestion(null);
      setReproSteps("");
      setExpected("");
      setActual("");
      setEnv("");
      setAssigneeIds([]);
      setDueDate("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10000 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeNewIssue}
      />
      <div className="relative flex h-dvh w-full max-w-3xl animate-scale-in flex-col overflow-hidden border border-border bg-card shadow-2xl sm:h-auto sm:max-h-[90vh] sm:min-h-[510px] sm:rounded-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <CustomSelect
              options={projects.map((p) => ({
                value: p.id,
                label: p.name,
                icon: (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-sm flex items-center gap-1.5 text-[10px] font-semibold",
                      !p.color && "bg-muted/20 text-muted-foreground",
                    )}
                    style={
                      p.color
                        ? {
                            backgroundColor: `${p.color}15`,
                            color: p.color,
                            border: `1px solid ${p.color}30`,
                          }
                        : undefined
                    }
                  >
                    {p.icon}
                  </span>
                ),
              }))}
              value={currentProject.id}
              onChange={(val) => {
                const project = projects.find((p) => p.id === val);
                if (project) setCurrentProject(project);
              }}
              className="min-w-0 sm:w-36 sm:shrink-0"
              triggerClassName="bg-muted border-border hover:bg-accent/40 sm:h-7"
              optionsClassName="z-10000!"
            />
            <CustomSelect
              options={TYPE_OPTIONS}
              value={type}
              onChange={(val) => setType(val as IssueType)}
              className="min-w-0 sm:w-36 sm:shrink-0"
              triggerClassName="bg-muted border-border hover:bg-accent/40 sm:h-7"
              optionsClassName="z-10000!"
            />
            <span className="col-span-2 text-xs text-muted-foreground font-mono sm:col-span-1">
              {nextIssueKeyPreview}
            </span>
          </div>
          <button
            onClick={closeNewIssue}
            className="rounded-lg p-2 hover:bg-accent transition-colors sm:p-1"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {parentIssueForCreate && (
          <div className="px-5 py-2 border-b border-border bg-muted/20 flex items-center gap-2 text-xs min-w-0">
            <span className="text-muted-foreground shrink-0">Sub-issue of</span>
            <span className="font-mono text-foreground shrink-0">
              {parentIssueForCreate.issueKey}
            </span>
            <span className="text-foreground truncate min-w-0">
              {parentIssueForCreate.title}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4 sm:p-5">
          <div className="flex flex-1 flex-col gap-5 sm:flex-row sm:gap-8">
            <div className="space-y-2 sm:w-4/5">
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Issue title..."
                className="w-full bg-transparent text-xl font-semibold text-foreground placeholder:text-muted-foreground outline-none border-b border-border pb-2 sm:text-lg sm:pb-1.5"
              />
              <RichTextEditor
                value={description}
                onChange={setDesc}
                placeholder="Add a description..."
                minHeight="236px"
              />
              {(similarLoading || similar.length > 0) && (
                <div className="rounded-lg border border-border/80 bg-muted/25 p-3 space-y-2">
                  <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {similarLoading ? "Finding similar issues…" : "Similar issues"}
                  </div>
                  {!similarLoading && (
                    <ul className="space-y-1.5">
                      {similar.map((s) => (
                        <li key={s.id} className="text-xs min-w-0">
                          <DashboardLink
                            href={issuePath(currentProject.key, s.id)}
                            className="text-primary hover:underline font-mono shrink-0"
                            onClick={() => closeNewIssue()}
                          >
                            {s.issueKey}
                          </DashboardLink>
                          <span className="text-muted-foreground mx-1">·</span>
                          <span className="text-foreground/90">{s.title}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({s.match})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="grid gap-3 sm:flex sm:min-w-40 sm:max-w-40 sm:flex-col">
              <MetaField label="Assignees">
                <CustomSelect
                  multiple
                  options={assigneeOptions}
                  value={assigneeIds}
                  onChange={setAssigneeIds}
                  placeholder="Unassigned"
                  optionsClassName="z-10000!"
                  renderTrigger={() => (
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto w-full bg-transparent text-sm text-foreground outline-none cursor-pointer p-1 rounded hover:bg-accent/50 min-h-10 sm:max-h-12 sm:text-xs sm:min-h-[24px]">
                      {selectedAssignees.length === 0 ? (
                        <span className="text-muted-foreground italic text-[10px]">
                          Unassigned
                        </span>
                      ) : (
                        selectedAssignees.map((user) => (
                          <div
                            key={user.id}
                            className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm flex items-center gap-1.5 text-[10px]"
                          >
                            <Avatar
                              src={user.avatarUrl}
                              name={user.name}
                              size="xs"
                            />
                            <span>{user.name.split(" ")[0]}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                />
              </MetaField>
              <MetaField label="Status">
                <CustomSelect
                  options={statusOptions}
                  value={status}
                  onChange={(val) => setStatus(val as IssueStatus)}
                  triggerClassName="bg-transparent border-0 h-10 px-1 hover:bg-accent/30 shadow-none text-foreground font-medium sm:h-6"
                  optionsClassName="z-10000!"
                />
              </MetaField>
              <MetaField label="Priority">
                <CustomSelect
                  options={PRIORITY_OPTIONS}
                  value={priority}
                  onChange={(val) => setPriority(val as Priority)}
                  triggerClassName="bg-transparent border-0 h-10 px-1 hover:bg-accent/30 shadow-none text-foreground font-medium sm:h-6"
                  optionsClassName="z-10000!"
                />
              </MetaField>
              {/* <MetaField label="AI triage">
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-[10px]"
                    disabled={triageLoading}
                    onClick={() => void runTriageSuggestion()}
                  >
                    {triageLoading ? "Suggesting…" : "Suggest type & fields"}
                  </Button>
                  {triageSuggestion && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {triageSuggestion.rationale}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full h-7 text-[10px]"
                        onClick={() => {
                          setType(triageSuggestion.type);
                          setStatus(triageSuggestion.status);
                          setPriority(triageSuggestion.priority);
                          setShowBugFields(triageSuggestion.type === "bug");
                        }}
                      >
                        Apply suggestion
                      </Button>
                    </div>
                  )}
                </div>
              </MetaField> */}
              <MetaField label="Estimate (pts)">
                <input
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="0"
                  className="h-10 w-full bg-transparent text-sm text-foreground outline-none sm:h-auto sm:text-xs"
                />
              </MetaField>
              <MetaField label="Due date">
                <DatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder="No due date"
                  triggerClassName="h-10 border-0 bg-transparent px-1 shadow-none hover:bg-accent/30 sm:h-6"
                />
              </MetaField>
              {/* <MetaField label="Project">
              <span className="text-xs text-foreground">{currentProject.name}</span>
            </MetaField> */}
            </div>
          </div>

          {/* Bug-specific fields */}
          {showBugFields && (
            <div className="rounded-lg border border-red-500/20! bg-red-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider">
                <AlertCircle className="h-3.5 w-3.5" /> Bug Report Fields
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Environment
                  </label>
                  <Input
                    value={env}
                    onChange={(e) => setEnv(e.target.value)}
                    placeholder="e.g. Production, Chrome 121, macOS 14"
                    className="h-8 text-xs border-white/20! focus-visible:ring-white/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Reproduction Steps
                  </label>
                  <Textarea
                    value={reproSteps}
                    onChange={(e) => setReproSteps(e.target.value)}
                    placeholder="1. Go to...\n2. Click...\n3. See error"
                    className="min-h-[80px] text-xs border-white/20! focus-visible:ring-white/50"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Expected Result
                    </label>
                    <Textarea
                      value={expected}
                      onChange={(e) => setExpected(e.target.value)}
                      placeholder="What should happen?"
                      className="min-h-[60px] text-xs border-white/20! focus-visible:ring-white/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Actual Result
                    </label>
                    <Textarea
                      value={actual}
                      onChange={(e) => setActual(e.target.value)}
                      placeholder="What actually happened?"
                      className="min-h-[60px] text-xs border-white/20! focus-visible:ring-white/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:pb-3">
          {/* <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Paperclip className="h-3.5 w-3.5" /> Attach files
          </button> */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" size="sm" onClick={closeNewIssue}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
            >
              {submitting ? "Creating…" : "Create Issue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="text-[10px] font-medium text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}
