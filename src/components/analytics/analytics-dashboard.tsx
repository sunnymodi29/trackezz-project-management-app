"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { applyAnalyticsPlanGate } from "@/lib/analytics/apply-plan-gate";
import { computeOrgAnalytics } from "@/lib/analytics/compute";
import type { OrgAnalytics } from "@/lib/analytics/types";
import type { BootstrapData } from "@/lib/queries/bootstrap";
import { Card, CardHeader, CardTitle, CardContent, CustomSelect, Button } from "@/components/ui";
import {
  LineChart,
  GroupedBarChart,
  DonutChart,
  HorizontalBarChart,
} from "@/components/analytics/chart-primitives";
import {
  BarChart3,
  TrendingUp,
  Target,
  Bug,
  Clock,
  CheckCircle2,
  Activity,
  Users,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsDashboardProps {
  bootstrap: BootstrapData;
}

export function AnalyticsDashboard({ bootstrap }: AnalyticsDashboardProps) {
  const [projectFilter, setProjectFilter] = useState<string | null>(null);

  const projectOptions = useMemo(
    () => [
      { value: "", label: "All projects" },
      ...bootstrap.projects.map((p) => ({
        value: p.id,
        label: p.name,
        // icon: <span className={`text-sm leading-none text-white bg-[${p.color}] rounded py-1 px-2`}>{p.icon}</span>,
      })),
    ],
    [bootstrap.projects]
  );

  const analytics: OrgAnalytics = useMemo(() => {
    const raw = computeOrgAnalytics(bootstrap, projectFilter);
    return applyAnalyticsPlanGate(raw, bootstrap.billing?.isPro ?? false);
  }, [bootstrap, projectFilter]);

  const fullAnalytics = bootstrap.billing?.isPro ?? false;
  const { summary } = analytics;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Live metrics from your organization&apos;s issues and sprints.
          </p>
        </div>
        <CustomSelect
          options={projectOptions}
          value={projectFilter ?? ""}
          onChange={(val) =>
            setProjectFilter(typeof val === "string" && val ? val : null)
          }
          placeholder="All projects"
          className="min-w-52 max-w-52"
        />
      </div>

      {!fullAnalytics && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Basic analytics on Free</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upgrade to Pro for burndown, velocity, throughput charts, project
                  health, and assignee workload.
                </p>
              </div>
            </div>
            <Link href="/dashboard/settings?tab=billing">
              <Button size="sm">Upgrade to Pro</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {analytics.activeSprint && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-primary mb-1">
                  Active sprint
                </p>
                <p className="text-lg font-bold">{analytics.activeSprint.name}</p>
                <p className="text-xs text-muted-foreground">
                  {analytics.activeSprint.projectName} ·{" "}
                  {analytics.activeSprint.daysRemaining} days left ·{" "}
                  {analytics.activeSprint.completedCount}/
                  {analytics.activeSprint.issueCount} issues done (
                  {analytics.activeSprint.progress}%)
                </p>
              </div>
              <div className="text-3xl font-bold text-primary tabular-nums">
                {analytics.activeSprint.progress}%
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Completion rate"
          value={`${summary.completionRate}%`}
          sub={`${summary.completedIssues} of ${summary.totalIssues} issues`}
          icon={<BarChart3 className="h-4 w-4" />}
          color="text-primary"
        />
        <StatCard
          label="Story points done"
          value={summary.completedStoryPoints}
          sub={`${summary.totalStoryPoints} total pts`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-emerald-400"
        />
        <StatCard
          label="Open bugs"
          value={summary.openBugs}
          sub={`${summary.openIssues} open issues`}
          icon={<Bug className="h-4 w-4" />}
          color="text-red-400"
        />
        <StatCard
          label="Avg. resolution"
          value={
            summary.avgResolutionDays != null
              ? `${summary.avgResolutionDays}d`
              : "—"
          }
          sub={
            summary.avgResolutionDays != null
              ? "For completed issues"
              : "No completed issues yet"
          }
          icon={<Clock className="h-4 w-4" />}
          color="text-blue-400"
        />
      </div>

      {fullAnalytics && (
        <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="In progress"
          value={summary.inProgressCount}
          icon={<Activity className="h-4 w-4" />}
          color="text-amber-400"
        />
        <StatCard
          label="Active sprints"
          value={summary.activeSprints}
          icon={<Target className="h-4 w-4" />}
          color="text-purple-400"
        />
        <StatCard
          label="Completed"
          value={summary.completedIssues}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="text-emerald-400"
        />
        <StatCard
          label="Team load"
          value={analytics.assigneeLoad.length}
          sub="Assignees with work"
          icon={<Users className="h-4 w-4" />}
          color="text-teal-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Burndown (story points)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Active sprint scope vs. ideal burn; remaining uses issue completion dates.
            </p>
          </CardHeader>
          <CardContent>
            <LineChart
              data={analytics.burndown}
              xKey="date"
              yLabel="pts"
              emptyMessage={
                analytics.activeSprint
                  ? "No estimated work in the active sprint"
                  : "No active sprint — start a sprint to see burndown"
              }
              series={[
                {
                  key: "ideal",
                  label: "Ideal",
                  color: "oklch(0.60 0.23 280 / 0.45)",
                  dashed: true,
                  getValue: (p) => p.ideal,
                },
                {
                  key: "remaining",
                  label: "Remaining",
                  color: "oklch(0.60 0.23 280)",
                  getValue: (p) => p.remaining,
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Sprint velocity
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Committed vs. completed story points per sprint.
            </p>
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              data={analytics.velocity.map((v) => ({
                sprint: v.sprint.length > 12 ? `${v.sprint.slice(0, 10)}…` : v.sprint,
                committed: v.committed,
                completed: v.completed,
              }))}
              xKey="sprint"
              emptyMessage="No sprints yet — create sprints to track velocity"
              groups={[
                {
                  key: "committed",
                  label: "Committed",
                  color: "oklch(0.25 0.02 260)",
                  getValue: (r) => r.committed,
                },
                {
                  key: "completed",
                  label: "Completed",
                  color: "oklch(0.60 0.23 280)",
                  getValue: (r) => r.completed,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues completed (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={analytics.dailyThroughput}
              xKey="date"
              emptyMessage="No issues completed in the last two weeks"
              series={[
                {
                  key: "completed",
                  label: "Completed",
                  color: "#34d399",
                  getValue: (p) => p.completed,
                },
              ]}
              height={220}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">New issues (8 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              data={analytics.weeklyCreated}
              xKey="week"
              height={220}
              emptyMessage="No issues created in this period"
              groups={[
                {
                  key: "count",
                  label: "Created",
                  color: "#60a5fa",
                  getValue: (r) => r.count,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {analytics.projectHealth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No projects
              </p>
            ) : (
              analytics.projectHealth.map((p) => (
                <div key={p.projectId} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span>{p.icon}</span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums">
                      {p.completed}/{p.total} · {p.rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${p.rate}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue types</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              segments={analytics.typeDistribution.map((d) => ({
                label: d.label,
                value: d.count,
                color: d.color,
              }))}
              emptyMessage="No issues to analyze"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By status</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              items={analytics.statusDistribution.map((d) => ({
                label: d.label,
                value: d.count,
                color: d.color,
              }))}
              emptyMessage="No issues"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By priority</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              items={analytics.priorityDistribution.map((d) => ({
                label: d.label,
                value: d.count,
                color: d.color,
              }))}
              emptyMessage="No issues"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignee workload
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Open vs. completed issues per team member.
          </p>
        </CardHeader>
        <CardContent>
          {analytics.assigneeLoad.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No assigned issues in this scope
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium text-right">Open</th>
                    <th className="pb-2 font-medium text-right">Done</th>
                    <th className="pb-2 font-medium w-1/3">Load</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.assigneeLoad.map((row) => {
                    const total = row.open + row.done;
                    const openPct = total > 0 ? (row.open / total) * 100 : 0;
                    return (
                      <tr
                        key={row.userId}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2.5 font-medium">{row.name}</td>
                        <td className="py-2.5 text-right text-amber-400 tabular-nums">
                          {row.open}
                        </td>
                        <td className="py-2.5 text-right text-emerald-400 tabular-nums">
                          {row.done}
                        </td>
                        <td className="py-2.5 pl-4">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-amber-400/80"
                              style={{ width: `${openPct}%` }}
                            />
                            <div
                              className="h-full bg-emerald-400/80"
                              style={{ width: `${100 - openPct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("p-2 rounded-lg bg-muted shrink-0", color)}>{icon}</div>
          <div className="text-right min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {sub && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {sub}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
