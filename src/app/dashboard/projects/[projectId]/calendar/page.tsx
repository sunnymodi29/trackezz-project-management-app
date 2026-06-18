"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { resolveProjectFromParam } from "@/lib/projects/route";
import { useDataStore } from "@/store/data-store";
import { ProjectCalendar } from "@/components/project-calendar";
import { DashboardLink } from "@/components/dashboard-link";
import { Button } from "@/components/ui";
import { CalendarDays, FolderOpen } from "lucide-react";

export default function ProjectCalendarPage() {
  const params = useParams();
  const routeParam = params.projectId as string;
  const { projects, issues } = useDataStore();

  const project = useMemo(
    () => resolveProjectFromParam(projects, routeParam) ?? projects[0],
    [projects, routeParam]
  );

  if (!project?.id) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] p-8 text-center">
        <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h1 className="text-lg font-semibold">No project selected</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Create a project first, then open the calendar to schedule issues by due date.
        </p>
        <DashboardLink href="/dashboard/projects" className="mt-6">
          <Button className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Go to Projects
          </Button>
        </DashboardLink>
      </div>
    );
  }

  return (
    <ProjectCalendar
      projectId={project.id}
      projectName={project.name}
      issues={issues}
    />
  );
}
