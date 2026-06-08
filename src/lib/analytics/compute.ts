import type { BootstrapData } from "@/lib/queries/bootstrap";
import { coerceDate, startOfDay } from "@/lib/issues/dates";
import {
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
  sortWorkflowStatuses,
} from "@/lib/projects/workflow-status";
import type { Issue, IssueType, Priority, Sprint } from "@/types";
import type {
  OrgAnalytics,
  BurndownPoint,
  VelocityPoint,
  DistributionPoint,
} from "@/lib/analytics/types";

const DEFAULT_STATUS_ORDER = [
  "backlog",
  "todo",
  "in-progress",
  "in-review",
  "done",
  "cancelled",
];

function buildStatusDistribution(
  data: BootstrapData,
  issues: Issue[],
  projectId: string | null,
) {
  const workflowRows = projectId
    ? data.workflowStatuses.filter((s) => s.projectId === projectId)
    : sortWorkflowStatuses(data.workflowStatuses);
  const order = [
    ...workflowRows.map((s) => s.key),
    ...DEFAULT_STATUS_ORDER.filter(
      (k) => !workflowRows.some((s) => s.key === k),
    ),
  ];
  for (const issue of issues) {
    if (!order.includes(issue.status)) order.push(issue.status);
  }
  const labels: Record<string, string> = {};
  const colors: Record<string, string> = {};
  for (const row of workflowRows) {
    labels[row.key] = row.label;
    colors[row.key] = row.color;
  }
  for (const key of order) {
    labels[key] ??= getWorkflowStatusLabel(workflowRows, key);
    colors[key] ??= getWorkflowStatusColor(workflowRows, key);
  }
  return countDistribution(
    issues.map((i) => ({ key: i.status })),
    order,
    labels,
    colors,
    (x) => x.key,
  );
}

const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low", "none"];

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "#f87171",
  high: "#fb923c",
  medium: "#facc15",
  low: "#60a5fa",
  none: "#71717a",
};

const TYPE_ORDER: IssueType[] = [
  "task",
  "bug",
  "feature",
  "story",
  "improvement",
  "epic",
];

const TYPE_LABELS: Record<IssueType, string> = {
  task: "Task",
  bug: "Bug",
  feature: "Feature",
  story: "Story",
  improvement: "Improvement",
  epic: "Epic",
};

const TYPE_COLORS: Record<IssueType, string> = {
  task: "#60a5fa",
  bug: "#f87171",
  feature: "#c084fc",
  story: "#4ade80",
  improvement: "#2dd4bf",
  epic: "#fbbf24",
};

function storyPoints(issue: Issue): number {
  return issue.estimate ?? 1;
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return startOfDay(d);
}

function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function filterByProject<T extends { projectId: string }>(
  items: T[],
  projectId: string | null
): T[] {
  if (!projectId) return items;
  return items.filter((i) => i.projectId === projectId);
}

function computeBurndown(
  activeSprint: Sprint | undefined,
  issues: Issue[]
): BurndownPoint[] {
  if (!activeSprint) return [];

  const sprintIssues = issues.filter((i) => i.sprintId === activeSprint.id);
  const totalPoints = sprintIssues.reduce((sum, i) => sum + storyPoints(i), 0);
  if (totalPoints === 0) return [];

  const start = startOfDay(coerceDate(activeSprint.startDate)!);
  const end = startOfDay(coerceDate(activeSprint.endDate)!);
  const today = startOfDay(new Date());
  const totalDays = daysBetweenInclusive(start, end) || 1;

  const points: BurndownPoint[] = [];

  for (let dayIndex = 0; dayIndex <= totalDays; dayIndex++) {
    const date = addDays(start, dayIndex);
    const dayEnd = endOfDay(date);
    const isFuture = date.getTime() > today.getTime();

    let completedPoints = 0;
    for (const issue of sprintIssues) {
      if (issue.status !== "done" && issue.status !== "cancelled") continue;
      const updated = coerceDate(issue.updatedAt);
      if (updated && updated.getTime() <= dayEnd.getTime()) {
        completedPoints += storyPoints(issue);
      }
    }

    const remaining = Math.max(0, totalPoints - completedPoints);
    const ideal = Math.max(0, totalPoints - (totalPoints * dayIndex) / totalDays);

    points.push({
      date: formatShortDate(date),
      ideal: Math.round(ideal * 10) / 10,
      remaining: isFuture ? null : Math.round(remaining * 10) / 10,
      completed: Math.round(completedPoints * 10) / 10,
    });
  }

  return points;
}

function computeVelocity(sprints: Sprint[], issues: Issue[]): VelocityPoint[] {
  return sprints
    .slice()
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((sprint) => {
      const sprintIssues = issues.filter((i) => i.sprintId === sprint.id);
      const committed = sprintIssues.reduce((sum, i) => sum + storyPoints(i), 0);
      const completed = sprintIssues
        .filter((i) => i.status === "done")
        .reduce((sum, i) => sum + storyPoints(i), 0);
      return {
        sprint: sprint.name,
        sprintId: sprint.id,
        committed,
        completed,
        status: sprint.status,
      };
    });
}

function countDistribution<T extends string>(
  items: { key: T }[],
  order: T[],
  labels: Record<T, string>,
  colors: Record<T, string>,
  getKey: (item: (typeof items)[0]) => T
): DistributionPoint[] {
  const counts = new Map<T, number>();
  for (const key of order) counts.set(key, 0);
  for (const item of items) {
    const k = getKey(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return order
    .map((key) => ({
      key,
      label: labels[key],
      count: counts.get(key) ?? 0,
      color: colors[key],
    }))
    .filter((d) => d.count > 0);
}

function computeAvgResolutionDays(issues: Issue[]): number | null {
  const done = issues.filter((i) => i.status === "done");
  if (done.length === 0) return null;

  const totalMs = done.reduce((sum, issue) => {
    const created = coerceDate(issue.createdAt);
    const updated = coerceDate(issue.updatedAt);
    if (!created || !updated) return sum;
    return sum + Math.max(0, updated.getTime() - created.getTime());
  }, 0);

  const avgMs = totalMs / done.length;
  return Math.round((avgMs / 86400000) * 10) / 10;
}

function computeWeeklyCreated(issues: Issue[]): { week: string; count: number }[] {
  const today = startOfDay(new Date());
  const buckets: { week: string; count: number; start: Date; end: Date }[] = [];

  for (let i = 7; i >= 0; i--) {
    const weekEnd = addDays(today, -7 * i);
    const weekStart = addDays(weekEnd, -6);
    buckets.push({
      week: formatWeekLabel(weekStart),
      count: 0,
      start: weekStart,
      end: endOfDay(weekEnd),
    });
  }

  for (const issue of issues) {
    const created = coerceDate(issue.createdAt);
    if (!created) continue;
    for (const bucket of buckets) {
      if (created >= bucket.start && created <= bucket.end) {
        bucket.count += 1;
        break;
      }
    }
  }

  return buckets.map(({ week, count }) => ({ week, count }));
}

function computeDailyThroughput(issues: Issue[], days = 14): { date: string; completed: number }[] {
  const today = startOfDay(new Date());
  const result: { date: string; completed: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const dayEnd = endOfDay(date);
    const dayStart = startOfDay(date);
    const count = issues.filter((issue) => {
      if (issue.status !== "done") return false;
      const updated = coerceDate(issue.updatedAt);
      return updated && updated >= dayStart && updated <= dayEnd;
    }).length;
    result.push({ date: formatShortDate(date), completed: count });
  }

  return result;
}

function computeAssigneeLoad(
  issues: Issue[],
  projectMembers: BootstrapData["projectMembers"],
  projectId: string | null
): OrgAnalytics["assigneeLoad"] {
  const members = projectId
    ? projectMembers.filter((m) => m.projectId === projectId)
    : projectMembers;

  const byUser = new Map<
    string,
    { name: string; avatarUrl?: string; open: number; done: number }
  >();

  for (const m of members) {
    byUser.set(m.userId, {
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      open: 0,
      done: 0,
    });
  }

  for (const issue of issues) {
    for (const uid of issue.assigneeIds) {
      const row = byUser.get(uid);
      if (!row) continue;
      if (issue.status === "done") row.done += 1;
      else if (issue.status !== "cancelled") row.open += 1;
    }
  }

  return Array.from(byUser.entries())
    .map(([userId, row]) => ({ userId, ...row }))
    .filter((r) => r.open > 0 || r.done > 0)
    .sort((a, b) => b.open - a.open)
    .slice(0, 8);
}

export function computeOrgAnalytics(
  data: BootstrapData,
  projectId: string | null = null
): OrgAnalytics {
  const issues = filterByProject(data.issues, projectId);
  const sprints = filterByProject(data.sprints, projectId);
  const projects = projectId
    ? data.projects.filter((p) => p.id === projectId)
    : data.projects;

  const completedIssues = issues.filter((i) => i.status === "done").length;
  const openBugs = issues.filter(
    (i) => i.type === "bug" && i.status !== "done" && i.status !== "cancelled"
  ).length;
  const openIssues = issues.filter(
    (i) => i.status !== "done" && i.status !== "cancelled"
  ).length;
  const inProgressCount = issues.filter((i) => i.status === "in-progress").length;
  const totalIssues = issues.length;
  const activeSprints = sprints.filter((s) => s.status === "active");
  const activeSprintEntity = activeSprints[0];

  const totalStoryPoints = issues.reduce((s, i) => s + storyPoints(i), 0);
  const completedStoryPoints = issues
    .filter((i) => i.status === "done")
    .reduce((s, i) => s + storyPoints(i), 0);

  const activeSprint: OrgAnalytics["activeSprint"] = activeSprintEntity
    ? (() => {
        const proj = projects.find((p) => p.id === activeSprintEntity.projectId);
        const sprintIssues = issues.filter(
          (i) => i.sprintId === activeSprintEntity.id
        );
        const done = sprintIssues.filter((i) => i.status === "done").length;
        const daysRemaining = Math.max(
          0,
          Math.ceil(
            (activeSprintEntity.endDate.getTime() - Date.now()) / 86400000
          )
        );
        return {
          id: activeSprintEntity.id,
          name: activeSprintEntity.name,
          projectName: proj?.name ?? "Project",
          progress:
            sprintIssues.length > 0
              ? Math.round((done / sprintIssues.length) * 100)
              : 0,
          daysRemaining,
          issueCount: sprintIssues.length,
          completedCount: done,
        };
      })()
    : null;

  return {
    summary: {
      totalIssues,
      completedIssues,
      openIssues,
      openBugs,
      completionRate:
        totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0,
      avgResolutionDays: computeAvgResolutionDays(issues),
      activeSprints: activeSprints.length,
      totalStoryPoints,
      completedStoryPoints,
      inProgressCount,
    },
    burndown: computeBurndown(activeSprintEntity, issues),
    velocity: computeVelocity(sprints, issues),
    statusDistribution: buildStatusDistribution(data, issues, projectId),
    priorityDistribution: countDistribution(
      issues.map((i) => ({ key: i.priority })),
      PRIORITY_ORDER,
      PRIORITY_LABELS,
      PRIORITY_COLORS,
      (x) => x.key
    ),
    typeDistribution: countDistribution(
      issues.map((i) => ({ key: i.type })),
      TYPE_ORDER,
      TYPE_LABELS,
      TYPE_COLORS,
      (x) => x.key
    ),
    projectHealth: projects.map((p) => {
      const pIssues = data.issues.filter((i) => i.projectId === p.id);
      const pCompleted = pIssues.filter((i) => i.status === "done").length;
      return {
        projectId: p.id,
        name: p.name,
        icon: p.icon,
        total: pIssues.length,
        completed: pCompleted,
        rate: pIssues.length > 0 ? Math.round((pCompleted / pIssues.length) * 100) : 0,
      };
    }),
    weeklyCreated: computeWeeklyCreated(issues),
    dailyThroughput: computeDailyThroughput(issues),
    assigneeLoad: computeAssigneeLoad(issues, data.projectMembers, projectId),
    activeSprint,
  };
}

/** Legacy shape used by dashboard home. */
export function toLegacyAnalytics(analytics: OrgAnalytics) {
  return {
    burndownData: analytics.burndown.map((d) => ({
      date: d.date,
      ideal: d.ideal,
      remaining: d.remaining,
    })),
    velocityData: analytics.velocity.map((d) => ({
      sprint: d.sprint,
      committed: d.committed,
      completed: d.completed,
    })),
  };
}
