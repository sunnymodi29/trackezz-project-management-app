"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLink } from "@/components/dashboard-link";
import { Users, Trash2, Settings } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDataStore } from "@/store/data-store";
import { useAppStore } from "@/store/app-store";
import { resolveProjectFromParam, projectPath } from "@/lib/projects/route";
import {
  pushWithDashboardRouteTransition,
  replaceWithDashboardRouteTransition,
} from "@/lib/navigation/dashboard-navigation";
import { updateProject, deleteProject } from "@/lib/actions/projects";
import { canManageProject } from "@/lib/permissions/client";
import { toastError, toastSuccess } from "@/lib/ui/toast";

export function ProjectSettings() {
  const params = useParams();
  const router = useRouter();
  const routeParam = params.projectId as string;

  const {
    projects,
    permissions,
    projectMembers,
    currentUser,
    upsertProject,
    removeProject,
  } = useDataStore();
  const { setCurrentProject } = useAppStore();

  const project = useMemo(
    () => resolveProjectFromParam(projects, routeParam),
    [projects, routeParam],
  );

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = project
    ? canManageProject(
        { permissions, projectMembers, currentUser },
        project.id,
      )
    : false;

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setKey(project.key);
    setDescription(project.description ?? "");
  }, [project]);

  useEffect(() => {
    if (!project || canManage) return;
    replaceWithDashboardRouteTransition(router, projectPath(project.key));
  }, [project, canManage, router]);

  if (!project || !canManage) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Project not found.
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProject(project.id, {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description,
      });
      upsertProject(updated);
      setCurrentProject(updated);
      setKey(updated.key);
      toastSuccess("Project saved.");
      router.refresh();
      if (updated.key !== routeParam) {
        replaceWithDashboardRouteTransition(
          router,
          projectPath(updated.key, "/settings"),
        );
      }
    } catch (e) {
      toastError(e, "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(project.id);
      removeProject(project.id);
      setDeleteOpen(false);
      pushWithDashboardRouteTransition(router, "/dashboard/projects");
      router.refresh();
    } catch (e) {
      toastError(e, "Failed to delete project");
      setDeleting(false);
    }
  };

  const dirty =
    name.trim() !== project.name ||
    key.trim().toUpperCase() !== project.key ||
    (description.trim() || "") !== (project.description ?? "");

  return (
    <>
      <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Project settings</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Update project details and manage access.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManage}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project key</label>
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  disabled={!canManage}
                  className="font-mono uppercase"
                  maxLength={10}
                />
                <p className="text-[10px] text-muted-foreground">
                  Used in issue keys (e.g. {key.trim() || "TF"}-1). Changing
                  this updates URLs.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canManage}
                rows={3}
                placeholder="Optional project summary"
              />
            </div>

            {canManage && (
              <Button
                onClick={() => void handleSave()}
                disabled={saving || !dirty || !name.trim()}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Invite members and assign project roles.
            </p>
            <DashboardLink href={projectPath(project.key, "/members")}>
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Manage members
              </Button>
            </DashboardLink>
          </CardContent>
        </Card>

        {canManage && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Danger zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete this project, all issues, sprints, and
                labels. This cannot be undone.
              </p>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${project.name}?`}
        description="All issues and project data will be removed permanently."
        confirmLabel="Delete project"
        variant="destructive"
        loading={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
