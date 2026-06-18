import { requireWorkspaceBootstrap } from "@/lib/queries/bootstrap";
import { getProjectByRouteParam } from "@/lib/queries/projects";
import { issuePath } from "@/lib/projects/route";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from "@/components/ui";
import { StatusBadge, PriorityBadge, SeverityBadge } from "@/components/ui/issue-badges";
import { Bug, AlertTriangle, ArrowRight, Terminal, Info, CheckCircle2 } from "lucide-react";
import { DashboardLink } from "@/components/dashboard-link";
import type { Metadata } from "next";
import type { Issue } from "@/types";

function bugStatusDistribution(bugs: Issue[]) {
  const active = bugs.filter((b) => b.status !== "cancelled");
  const total = active.length;
  const fixed = active.filter((b) => b.status === "done").length;
  const working = active.filter(
    (b) => b.status === "in-progress" || b.status === "in-review",
  ).length;
  const open = active.filter(
    (b) => b.status === "backlog" || b.status === "todo",
  ).length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    total,
    fixed: { count: fixed, pct: pct(fixed) },
    working: { count: working, pct: pct(working) },
    open: { count: open, pct: pct(open) },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId: projectKey } = await params;
  const data = await requireWorkspaceBootstrap();
  const project = await getProjectByRouteParam(projectKey, data.organization.id);
  const name = project?.name ?? "Project";
  return { title: `Bugs | ${name}` };
}

export default async function ProjectBugsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectKey } = await params;
  const data = await requireWorkspaceBootstrap();
  const project = await getProjectByRouteParam(projectKey, data.organization.id);
  if (!project) notFound();
  const bugs = data.issues.filter((i) => i.projectId === project.id && i.type === "bug");
  const openBugs = bugs.filter(
    (b) => b.status !== "done" && b.status !== "cancelled",
  );
  const distribution = bugStatusDistribution(bugs);
  const aiSessions = data.aiConversations.filter((c) => c.projectId === project.id);
  const aiMessageCount = aiSessions.reduce((n, c) => n + c.messages.length, 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bug className="h-6 w-6 text-red-400" /> Bug Tracking
          </h1>
          <p className="text-muted-foreground mt-1">Manage and debug project issues.</p>
        </div>
        <div className="flex gap-3">
          <Card className="px-4 py-2 border-red-500/20 bg-red-500/5">
             <div className="text-[10px] uppercase font-bold text-red-400 opacity-70">Critical Bugs</div>
             <div className="text-lg font-bold">{bugs.filter(b => b.severity === 'critical').length}</div>
          </Card>
          <Card className="px-4 py-2 border-orange-500/20 bg-orange-500/5">
             <div className="text-[10px] uppercase font-bold text-orange-400 opacity-70">Major Issues</div>
             <div className="text-lg font-bold">{bugs.filter(b => b.severity === 'major').length}</div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {openBugs.map(bug => (
          <Card key={bug.id} className="hover:border-red-400/30 transition-colors group relative overflow-hidden">
             {bug.severity === 'critical' && <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />}
             <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                   <Badge variant="outline" className="font-mono text-[10px]">{bug.issueKey}</Badge>
                   <SeverityBadge severity={bug.severity || 'minor'} />
                </div>
                <CardTitle className="text-sm line-clamp-2">{bug.title}</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                   <StatusBadge status={bug.status} />
                   <PriorityBadge priority={bug.priority} />
                </div>
                
                {bug.environment && (
                  <div className="p-2 rounded bg-muted/50 border border-border/50 text-[10px] font-mono flex items-center gap-2">
                    <Terminal className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{bug.environment}</span>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                   <div className="text-[10px] font-bold text-muted-foreground uppercase">Highlights</div>
                   <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <div className="mt-1 h-1 w-1 rounded-full bg-red-400 shrink-0" />
                      <span className="line-clamp-2">{bug.actualResult?.slice(0, 80)}...</span>
                   </div>
                </div>

                <DashboardLink href={issuePath(project.key, bug.id)} className="block">
                  <Button variant="ghost" size="sm" className="w-full text-[11px] h-8 mt-2 group-hover:bg-accent/80">
                    Fix Bug <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </DashboardLink>
             </CardContent>
          </Card>
        ))}

        {openBugs.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl">
             <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
             <h2 className="text-xl font-bold">No open bugs!</h2>
             <p className="text-sm text-muted-foreground mt-1">Your code seems perfectly healthy. Go take a break.</p>
          </div>
        )}
      </div>

      <div className="mt-12 flex flex-col md:flex-row gap-6">
        <Card className="flex-1 bg-card">
          <CardHeader>
            <CardTitle className="text-sm">
              Bug Status Distribution
              {distribution.total > 0 && (
                <span className="text-muted-foreground font-normal ml-2">
                  ({distribution.total} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distribution.total === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No bugs recorded for this project yet.
              </p>
            ) : (
              <>
                <div className="flex h-4 rounded-full overflow-hidden bg-muted/40">
                  {distribution.fixed.pct > 0 && (
                    <div
                      className="bg-emerald-400 h-full min-w-0"
                      style={{ width: `${distribution.fixed.pct}%` }}
                      title={`Fixed: ${distribution.fixed.count}`}
                    />
                  )}
                  {distribution.working.pct > 0 && (
                    <div
                      className="bg-amber-400 h-full min-w-0"
                      style={{ width: `${distribution.working.pct}%` }}
                      title={`In progress: ${distribution.working.count}`}
                    />
                  )}
                  {distribution.open.pct > 0 && (
                    <div
                      className="bg-red-400 h-full min-w-0"
                      style={{ width: `${distribution.open.pct}%` }}
                      title={`Open: ${distribution.open.count}`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Fixed ({distribution.fixed.pct}% · {distribution.fixed.count})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Working ({distribution.working.pct}% · {distribution.working.count})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    Open ({distribution.open.pct}% · {distribution.open.count})
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:w-1/3">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-sm font-medium">
              <Info className="h-4 w-4 text-primary" />
              <span>
                {aiSessions.length > 0
                  ? "AI Diagnostics Ready"
                  : "AI Diagnostics"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              {aiSessions.length > 0 ? (
                <>
                  TrackEzz has analyzed {aiSessions.length} session
                  {aiSessions.length !== 1 ? "s" : ""}
                  {aiMessageCount > 0 && (
                    <>
                      {" "}
                      ({aiMessageCount} message{aiMessageCount !== 1 ? "s" : ""})
                    </>
                  )}
                  . Root cause detection is active for this project.
                </>
              ) : (
                <>
                  No AI sessions on this project yet. Open a bug and use AI chat
                  to start root-cause analysis.
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
