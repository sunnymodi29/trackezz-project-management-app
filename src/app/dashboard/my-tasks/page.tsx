import { getBootstrapData } from "@/lib/queries/bootstrap";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { StatusBadge, PriorityBadge, IssueTypeIcon } from "@/components/ui/issue-badges";
import { formatRelativeTime } from "@/lib/utils";
import { CheckCircle2, ListTodo, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import { projectKeyForId, issuePath } from "@/lib/projects/route";
import type { Metadata } from "next";
import type { Issue } from "@/types";

export const metadata: Metadata = { title: "My Tasks" };

export default async function MyTasksPage() {
  const data = await getBootstrapData();
  if (!data.hasWorkspace) return null;

  const { currentUser, issues, projects } = data;
  const myIssues = issues.filter((i) => i.assigneeIds.includes(currentUser.id));
  const openIssues = myIssues.filter((i) => i.status !== "done" && i.status !== "cancelled");
  const completedIssues = myIssues.filter((i) => i.status === "done");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
          <p className="text-muted-foreground mt-1">Issues assigned to you across all projects.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Active Tasks */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Active ({openIssues.length})
            </h2>
            <div className="space-y-2">
              {openIssues.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    You have no active tasks at the moment.
                  </CardContent>
                </Card>
              )}
              {openIssues.map((issue) => (
                <TaskRow key={issue.id} issue={issue} projects={projects} />
              ))}
            </div>
          </section>

          {/* Completed Tasks */}
          {completedIssues.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Completed ({completedIssues.length})
              </h2>
              <div className="space-y-2 opacity-70">
                {completedIssues.map((issue) => (
                  <TaskRow key={issue.id} issue={issue} projects={projects} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Stats / Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Assigned</span>
                <span className="font-semibold">{myIssues.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Open Tasks</span>
                <span className="font-semibold text-primary">{openIssues.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold text-emerald-400">{completedIssues.length}</span>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2">Completion Rate</div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(completedIssues.length / (myIssues.length || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">
                    {Math.round((completedIssues.length / (myIssues.length || 1)) * 100)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {openIssues.filter(i => i.dueDate).slice(0, 3).map(i => (
                  <div key={i.id} className="flex flex-col gap-1">
                    <div className="text-sm font-medium truncate">{i.title}</div>
                    <div className="text-[10px] text-red-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> 
                      {i.dueDate?.toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {openIssues.filter(i => i.dueDate).length === 0 && (
                  <div className="text-xs text-muted-foreground italic">No upcoming deadlines</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ issue, projects }: { issue: Issue; projects: import("@/types").Project[] }) {
  return (
    <Link href={issuePath(projectKeyForId(projects, issue.projectId), issue.id)}>
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/30 transition-all group">
        <div className="shrink-0">
          <IssueTypeIcon type={issue.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">
              {issue.issueKey}
            </span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              {issue.project?.name}
            </span>
          </div>
          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {issue.title}
          </h3>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block">
            <PriorityBadge priority={issue.priority} />
          </div>
          <StatusBadge status={issue.status} />
        </div>
      </div>
    </Link>
  );
}
