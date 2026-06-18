"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, Settings } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent, Avatar } from "@/components/ui";
import { useDataStore } from "@/store/data-store";
import { projectPath, resolveProjectFromParam } from "@/lib/projects/route";
import { replaceWithDashboardRouteTransition } from "@/lib/navigation/dashboard-navigation";
import { canManageProject } from "@/lib/permissions/client";
import { ProjectManageDialog } from "@/components/project-manage-dialog";
import { PROJECT_ROLE_OPTIONS } from "@/lib/projects/constants";

export default function ProjectMembersPage() {
  const params = useParams();
  const router = useRouter();
  const projectKey = String(params.projectId ?? "");
  const {
    projects,
    permissions,
    projectMembers,
    currentUser,
    getProjectMembers,
  } = useDataStore();
  const [manageOpen, setManageOpen] = useState(false);

  const project = useMemo(
    () => resolveProjectFromParam(projects, projectKey),
    [projects, projectKey],
  );

  const canManage = useMemo(
    () =>
      project
        ? canManageProject(
            { permissions, projectMembers, currentUser },
            project.id,
          )
        : false,
    [project, permissions, projectMembers, currentUser],
  );

  useEffect(() => {
    if (!project || canManage) return;
    replaceWithDashboardRouteTransition(router, projectPath(project.key));
  }, [project, canManage, router]);

  if (!project) {
    return (
      <div className="p-6 text-muted-foreground text-sm">Project not found.</div>
    );
  }

  if (!canManage) {
    return null;
  }

  const members = getProjectMembers(project.id);

  const roleLabel = (role: string) =>
    PROJECT_ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;

  return (
    <>
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Members
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {project.name} ({project.key})
          </p>
        </div>
        <Button className="gap-2" size="sm" onClick={() => setManageOpen(true)}>
          <Settings className="h-4 w-4" /> Manage
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project team ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <Avatar src={m.user.avatarUrl} name={m.user.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{m.user.email}</div>
              </div>
              <span className="text-xs text-muted-foreground">{roleLabel(m.role)}</span>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No members yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
    <ProjectManageDialog
    project={manageOpen ? project : null}
    onClose={() => setManageOpen(false)}
  />
  </>
  );
}
