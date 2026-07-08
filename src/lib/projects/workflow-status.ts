import type { WorkflowStatus } from "@/types";

export const DEFAULT_WORKFLOW_STATUSES: Omit<
  WorkflowStatus,
  "id" | "projectId" | "createdAt"
>[] = [
  { key: "backlog", label: "Backlog", color: "#71717a", position: 0 },
  { key: "todo", label: "Todo", color: "#a1a1aa", position: 1 },
  { key: "in-progress", label: "In Progress", color: "#60a5fa", position: 2 },
  { key: "in-review", label: "In Review", color: "#c084fc", position: 3 },
  { key: "done", label: "Done", color: "#34d399", position: 4 },
  { key: "cancelled", label: "Cancelled", color: "#f87171", position: 5 },
];

/**
 * Workflow status keys in TrackEzz use hyphens (e.g. `in-progress`). Models often
 * emit snake_case (`in_progress`); normalize before DB lookup.
 */
export function normalizeWorkflowStatusKey(key: string): string {
  return key.trim().replace(/_/g, "-");
}

export function slugifyStatusKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "status";
}

export function sortWorkflowStatuses(
  statuses: WorkflowStatus[],
): WorkflowStatus[] {
  return [...statuses].sort((a, b) => a.position - b.position);
}

export function getWorkflowStatusLabel(
  statuses: WorkflowStatus[],
  key: string,
): string {
  return (
    statuses.find((s) => s.key === key)?.label ??
    DEFAULT_WORKFLOW_STATUSES.find((s) => s.key === key)?.label ??
    key
  );
}

export function getWorkflowStatusColor(
  statuses: WorkflowStatus[],
  key: string,
): string {
  return (
    statuses.find((s) => s.key === key)?.color ??
    DEFAULT_WORKFLOW_STATUSES.find((s) => s.key === key)?.color ??
    "#71717a"
  );
}

export function workflowStatusSelectOptions(
  statuses: WorkflowStatus[],
): { value: string; label: string }[] {
  return sortWorkflowStatuses(statuses).map((s) => ({
    value: s.key,
    label: s.label,
  }));
}

export function statusColorWithAlpha(color: string, alpha = 0.082): string {
  const trimmed = color.trim();

  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    const normalized =
      hex.length === 3
        ? hex
            .split("")
            .map((char) => char + char)
            .join("")
        : hex.slice(0, 6);

    if (normalized.length === 6) {
      const r = Number.parseInt(normalized.slice(0, 2), 16);
      const g = Number.parseInt(normalized.slice(2, 4), 16);
      const b = Number.parseInt(normalized.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  }

  if (trimmed.startsWith("hsl(")) {
    return trimmed.replace(/^hsl\((.+)\)$/, `hsla($1, ${alpha})`);
  }

  if (trimmed.startsWith("hsla(")) {
    return trimmed;
  }

  return `color-mix(in srgb, ${trimmed} ${alpha * 100}%, transparent)`;
}

export function randomStatusColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 55 + Math.floor(Math.random() * 25);
  const lightness = 48 + Math.floor(Math.random() * 12);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function hslToHex(h: number, s: number, l: number): string {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (huePrime >= 0 && huePrime < 1) [r, g, b] = [chroma, x, 0];
  else if (huePrime < 2) [r, g, b] = [x, chroma, 0];
  else if (huePrime < 3) [r, g, b] = [0, chroma, x];
  else if (huePrime < 4) [r, g, b] = [0, x, chroma];
  else if (huePrime < 5) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  const m = lightness - chroma / 2;
  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function colorToHex(color: string): string {
  const trimmed = color.trim();

  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed.slice(0, 7);
  }

  const hslMatch = trimmed.match(
    /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/,
  );
  if (hslMatch) {
    return hslToHex(
      Number(hslMatch[1]),
      Number(hslMatch[2]),
      Number(hslMatch[3]),
    );
  }

  return "#71717a";
}

