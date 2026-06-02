import { getBootstrapData, getAnalyticsData } from "@/lib/queries/bootstrap";
import { Card, CardHeader, CardTitle, CardContent, Avatar, ProgressBar, Badge } from "@/components/ui";
import { StatusBadge, PriorityBadge, IssueTypeIcon } from "@/components/ui/issue-badges";
import { formatRelativeTime } from "@/lib/utils";
import {
  CheckCircle2, Bug, Clock, TrendingUp, AlertCircle,
  ArrowUpRight, BarChart3, Target, Activity
} from "lucide-react";
import Link from "next/link";
import { projectKeyForId, projectPath, issuePath } from "@/lib/projects/route";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getBootstrapData();
  if (!data.hasWorkspace) return null;

  const { currentUser, issues, notifications, projects, sprints, activityLogs } =
    data;
  const { velocityData } = await getAnalyticsData();

  const myIssues = issues
    .filter((i) => i.assigneeIds.includes(currentUser.id) && i.status !== "done")
    .slice(0, 5);
  const openBugs = issues.filter(
    (i) => i.type === "bug" && i.status !== "done" && i.status !== "cancelled"
  );
  const inProgress = issues.filter((i) => i.status === "in-progress");
  const activeSprint = sprints.find((s) => s.status === "active");
  const totalDone = issues.filter((i) => i.status === "done").length;
  const unreadNotifs = notifications.filter((n) => !n.read);
  const openIssueCount = issues.filter(
    (i) => i.status !== "done" && i.status !== "cancelled"
  ).length;
  const urgentBugs = openBugs.filter((b) => b.priority === "urgent").length;

  return (
    <div className="p-6 space-y-6 mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good day, {currentUser.name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening across your organization today.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {unreadNotifs.length > 0 && (
            <Link href="/dashboard/inbox">
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/20 transition-colors">
                <AlertCircle className="h-3.5 w-3.5" />
                {unreadNotifs.length} unread notification{unreadNotifs.length !== 1 ? "s" : ""}
              </div>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Issues"
          value={openIssueCount}
          icon={<Activity className="h-4 w-4" />}
          color="text-blue-400"
          bg="bg-blue-400/10"
          change={`${projects.length} projects`}
        />
        <StatCard
          title="In Progress"
          value={inProgress.length}
          icon={<Clock className="h-4 w-4" />}
          color="text-amber-400"
          bg="bg-amber-400/10"
          change={`${inProgress.length} active`}
        />
        <StatCard
          title="Open Bugs"
          value={openBugs.length}
          icon={<Bug className="h-4 w-4" />}
          color="text-red-400"
          bg="bg-red-400/10"
          change={`${urgentBugs} urgent`}
        />
        <StatCard
          title="Completed"
          value={totalDone}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
          change={
            activeSprint
              ? `${activeSprint.completedCount}/${activeSprint.issueCount} in sprint`
              : `${totalDone} total`
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> My Tasks
                </CardTitle>
                <Link href="/dashboard/my-tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myIssues.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    🎉 No open tasks assigned to you
                  </div>
                )}
                {myIssues.map((issue) => (
                  <Link key={issue.id} href={issuePath(projectKeyForId(projects, issue.projectId), issue.id)} className="block">
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors group">
                      <IssueTypeIcon type={issue.type} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{issue.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground">{issue.issueKey}</span>
                          {issue.project && <span className="text-xs text-muted-foreground">{issue.project.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={issue.priority} />
                        <StatusBadge status={issue.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Team Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <Avatar src={log.user.avatarUrl} name={log.user.name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground font-medium">{log.user.name}</span>
                      <span className="text-sm text-muted-foreground"> {log.action} </span>
                      <span className="text-sm text-foreground">{log.details}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {activeSprint && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Active Sprint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-base font-semibold text-foreground">{activeSprint.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{activeSprint.goal}</div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">
                        {activeSprint.completedCount}/{activeSprint.issueCount} issues
                      </span>
                    </div>
                    <ProgressBar value={activeSprint.completedCount} max={activeSprint.issueCount} />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                      <span>Started {activeSprint.startDate.toLocaleDateString()}</span>
                      <span>Ends {activeSprint.endDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projects.map((p) => (
                  <Link key={p.id} href={projectPath(p.key)} className="flex items-center gap-3 group">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: `${p.color}20` }}>
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.issueCount} issues · {p.memberCount} members</div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Sprint Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {velocityData.map((d) => (
                  <div key={d.sprint}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{d.sprint}</span>
                      <span className="font-medium text-foreground">{d.completed}/{d.committed}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${d.committed > 0 ? (d.completed / d.committed) * 100 : 0}%`,
                          backgroundColor: d.completed >= d.committed ? "#10b981" : "#6366f1",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bg, change }: {
  title: string; value: number; icon: React.ReactNode; color: string; bg: string; change: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-2">{title}</div>
            <div className="text-3xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{change}</div>
          </div>
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${bg} ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
