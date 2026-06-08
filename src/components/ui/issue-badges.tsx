"use client";

import { cn } from "@/lib/utils";
import type { Priority, IssueType, IssueStatus, Severity } from "@/types";
import {
  AlertCircle, ArrowUp, ArrowDown, Minus, ChevronDown,
  CheckCircle2, Circle, Clock, PlayCircle, GitPullRequest,
  XCircle, AlertTriangle, Bug, Zap, Star, Layers,
  BookOpen, BarChart2
} from "lucide-react";

// ── Priority Icon & Label ──────────────────────────────────────────────────
const priorityConfig: Record<Priority, { label: string; icon: React.ReactNode; className: string }> = {
  urgent: { label: "Urgent", icon: <AlertCircle className="h-3.5 w-3.5" />, className: "text-red-400" },
  high:   { label: "High",   icon: <ArrowUp className="h-3.5 w-3.5" />,    className: "text-orange-400" },
  medium: { label: "Medium", icon: <Minus className="h-3.5 w-3.5" />,      className: "text-yellow-400" },
  low:    { label: "Low",    icon: <ArrowDown className="h-3.5 w-3.5" />,  className: "text-blue-400" },
  none:   { label: "None",   icon: <ChevronDown className="h-3.5 w-3.5" />,className: "text-zinc-500" },
};

export function PriorityIcon({ priority }: { priority: Priority }) {
  const { icon, className } = priorityConfig[priority] ?? priorityConfig.none;
  return <span className={className}>{icon}</span>;
}

export function PriorityBadge({ priority, className: customClass }: { priority: Priority; className?: string }) {
  const { label, icon, className } = priorityConfig[priority] ?? priorityConfig.none;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", className, customClass)}>
      {icon}{label}
    </span>
  );
}

// ── Status Icon & Label ────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string; bg: string }> = {
  backlog:     { label: "Backlog",     icon: <Circle className="h-3.5 w-3.5" />,         className: "text-zinc-500",   bg: "bg-zinc-500/10" },
  todo:        { label: "Todo",        icon: <Circle className="h-3.5 w-3.5" />,         className: "text-zinc-300",   bg: "bg-zinc-500/10" },
  "in-progress":{ label: "In Progress",icon: <PlayCircle className="h-3.5 w-3.5" />,     className: "text-blue-400",   bg: "bg-blue-500/10" },
  "in-review": { label: "In Review",  icon: <GitPullRequest className="h-3.5 w-3.5" />, className: "text-purple-400", bg: "bg-purple-500/10" },
  done:        { label: "Done",        icon: <CheckCircle2 className="h-3.5 w-3.5" />,   className: "text-emerald-400",bg: "bg-emerald-500/10" },
  cancelled:   { label: "Cancelled",  icon: <XCircle className="h-3.5 w-3.5" />,        className: "text-red-400",    bg: "bg-red-500/10" },
};

export function StatusIcon({ status }: { status: IssueStatus }) {
  const { icon, className } = statusConfig[status] ?? statusConfig.backlog;
  return <span className={className}>{icon}</span>;
}

export function StatusBadge({
  status,
  label,
  color,
  className: customClass,
}: {
  status: IssueStatus;
  label?: string;
  color?: string;
  className?: string;
}) {
  const fallback = statusConfig[status] ?? statusConfig.backlog;
  const displayLabel = label ?? fallback.label;

  if (color) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
          customClass,
        )}
        style={{
          color,
          borderColor: `${color}40`,
          backgroundColor: `${color}15`,
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        {displayLabel}
      </span>
    );
  }

  const { icon, className, bg } = fallback;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className, bg, customClass)}>
      {icon}{displayLabel}
    </span>
  );
}

// ── Issue Type Icon ─────────────────────────────────────────────────────────
const typeConfig: Record<IssueType, { label: string; icon: React.ReactNode; className: string }> = {
  task:        { label: "Task",        icon: <CheckCircle2 className="h-3.5 w-3.5" />,  className: "text-blue-400" },
  bug:         { label: "Bug",         icon: <Bug className="h-3.5 w-3.5" />,           className: "text-red-400" },
  feature:     { label: "Feature",     icon: <Star className="h-3.5 w-3.5" />,          className: "text-purple-400" },
  improvement: { label: "Improvement", icon: <Zap className="h-3.5 w-3.5" />,           className: "text-teal-400" },
  epic:        { label: "Epic",        icon: <Layers className="h-3.5 w-3.5" />,        className: "text-amber-400" },
  story:       { label: "Story",       icon: <BookOpen className="h-3.5 w-3.5" />,      className: "text-green-400" },
};

export function IssueTypeIcon({ type }: { type: IssueType }) {
  const { icon, className } = typeConfig[type] ?? typeConfig.task;
  return <span className={cn("inline-flex", className)}>{icon}</span>;
}

export function IssueTypeBadge({ type }: { type: IssueType }) {
  const { label, icon, className } = typeConfig[type] ?? typeConfig.task;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", className)}>
      {icon}{label}
    </span>
  );
}

// ── Severity Badge ─────────────────────────────────────────────────────────
const severityConfig: Record<Severity, { label: string; className: string }> = {
  critical: { label: "Critical", className: "text-red-400 bg-red-400/10 ring-1 ring-red-400/20" },
  major:    { label: "Major",    className: "text-orange-400 bg-orange-400/10 ring-1 ring-orange-400/20" },
  minor:    { label: "Minor",    className: "text-yellow-400 bg-yellow-400/10 ring-1 ring-yellow-400/20" },
  trivial:  { label: "Trivial",  className: "text-zinc-400 bg-zinc-500/10 ring-1 ring-zinc-500/20" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, className } = severityConfig[severity] ?? severityConfig.minor;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      <AlertTriangle className="h-3 w-3" />{label}
    </span>
  );
}

// ── Label Chip ─────────────────────────────────────────────────────────────
export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}
