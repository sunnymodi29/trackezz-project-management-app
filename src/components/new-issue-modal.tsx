"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { createIssue } from "@/lib/actions/issues";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  Button,
  Textarea,
  Input,
  CustomSelect,
  DatePicker,
} from "@/components/ui";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { normalizeRichTextForSave } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import {
  previewNextIssueKey,
  parseIssueNumberFromKey,
} from "@/lib/issues/issue-key";
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
  } = useAppStore();
  const router = useRouter();
  const {
    projects,
    currentUser,
    getProjectMembers,
    getWorkflowStatuses,
    upsertIssue,
    patchProject,
  } = useDataStore();
  const statusOptions = workflowStatusSelectOptions(
    getWorkflowStatuses(currentProject.id),
  );
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<IssueType>("task");
  const [title, setTitle] = useState("");
  const [description, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<IssueStatus>("todo");
  const [estimate, setEstimate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [showBugFields, setShowBugFields] = useState(false);
  const [reproSteps, setReproSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [env, setEnv] = useState("");
  const [dueDate, setDueDate] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeNewIssue}
      />
      <div className="relative w-full max-w-3xl max-h-[57vh] flex flex-col animate-scale-in rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <CustomSelect
              options={projects.map((p) => ({
                value: p.id,
                label: p.name,
                icon: <span>{p.icon}</span>,
              }))}
              value={currentProject.id}
              onChange={(val) => {
                const project = projects.find((p) => p.id === val);
                if (project) setCurrentProject(project);
              }}
              className="w-36 shrink-0"
              triggerClassName="bg-muted border-border hover:bg-accent/40 h-7"
            />
            <CustomSelect
              options={TYPE_OPTIONS}
              value={type}
              onChange={(val) => setType(val as IssueType)}
              className="w-36 shrink-0"
              triggerClassName="bg-muted border-border hover:bg-accent/40 h-7"
            />
            <span className="text-xs text-muted-foreground font-mono">
              {nextIssueKeyPreview}
            </span>
          </div>
          <button
            onClick={closeNewIssue}
            className="rounded-md p-1 hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          <div className="flex flex-1 gap-8">
            <div className="space-y-2 w-4/5">
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Issue title..."
                className="w-full bg-transparent text-lg font-semibold text-foreground placeholder:text-muted-foreground outline-none border-b border-border pb-1.5"
              />
              <RichTextEditor
                value={description}
                onChange={setDesc}
                placeholder="Add a description..."
                minHeight="236px"
              />
            </div>

            {/* Meta row */}
            <div className="gap-3 flex flex-col max-w-40 min-w-40">
              <MetaField label="Assignees">
                <CustomSelect
                  multiple
                  options={getProjectMembers(currentProject.id).map((m) => ({
                    value: m.user.id,
                    label: m.user.name,
                    avatarUrl: m.user.avatarUrl,
                  }))}
                  value={assigneeIds}
                  onChange={setAssigneeIds}
                  placeholder="Unassigned"
                  renderTrigger={(selected) => {
                    const selectedList = Array.isArray(selected)
                      ? selected
                      : [];
                    return (
                      <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto w-full bg-transparent text-xs text-foreground outline-none cursor-pointer p-1 rounded hover:bg-accent/50 min-h-[24px]">
                        {selectedList.length === 0 ? (
                          <span className="text-muted-foreground italic text-[10px]">
                            Unassigned
                          </span>
                        ) : (
                          selectedList.map((o) => (
                            <div
                              key={o.value}
                              className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm flex items-center gap-1.5 text-[10px]"
                            >
                              {o.avatarUrl && (
                                <img
                                  src={o.avatarUrl}
                                  alt={o.label}
                                  className="h-3.5 w-3.5 rounded-full object-cover"
                                />
                              )}
                              <span>{o.label.split(" ")[0]}</span>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  }}
                />
              </MetaField>
              <MetaField label="Status">
                <CustomSelect
                  options={statusOptions}
                  value={status}
                  onChange={(val) => setStatus(val as IssueStatus)}
                  triggerClassName="bg-transparent border-0 h-6 px-1 hover:bg-accent/30 shadow-none text-foreground font-medium"
                />
              </MetaField>
              <MetaField label="Priority">
                <CustomSelect
                  options={PRIORITY_OPTIONS}
                  value={priority}
                  onChange={(val) => setPriority(val as Priority)}
                  triggerClassName="bg-transparent border-0 h-6 px-1 hover:bg-accent/30 shadow-none text-foreground font-medium"
                />
              </MetaField>
              <MetaField label="Estimate (pts)">
                <input
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full bg-transparent text-xs text-foreground outline-none"
                />
              </MetaField>
              <MetaField label="Due date">
                <DatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder="No due date"
                  triggerClassName="h-6 border-0 bg-transparent px-1 shadow-none hover:bg-accent/30"
                />
              </MetaField>
              {/* <MetaField label="Project">
              <span className="text-xs text-foreground">{currentProject.name}</span>
            </MetaField> */}
            </div>
          </div>

          {/* Bug-specific fields */}
          {showBugFields && (
            <div className="rounded-lg border !border-red-500/20 bg-red-500/5 p-4 space-y-3">
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
                    className="h-8 text-xs !border-white/20 focus-visible:ring-white/50"
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
                    className="min-h-[80px] text-xs !border-white/20 focus-visible:ring-white/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Expected Result
                    </label>
                    <Textarea
                      value={expected}
                      onChange={(e) => setExpected(e.target.value)}
                      placeholder="What should happen?"
                      className="min-h-[60px] text-xs !border-white/20 focus-visible:ring-white/50"
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
                      className="min-h-[60px] text-xs !border-white/20 focus-visible:ring-white/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-border bg-muted/30">
          {/* <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Paperclip className="h-3.5 w-3.5" /> Attach files
          </button> */}
          <div className="flex gap-2">
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
