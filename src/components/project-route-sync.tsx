"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { projectPath, resolveProjectFromParam } from "@/lib/projects/route";

export function ProjectRouteSync() {
  const pathname = usePathname();
  const router = useRouter();
  const projects = useDataStore((s) => s.projects);
  const hydrated = useDataStore((s) => s.hydrated);
  const hasWorkspace = useDataStore((s) => s.hasWorkspace);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);

  useEffect(() => {
    if (!hydrated) return;

    const match = pathname.match(/^\/dashboard\/projects\/([^/]+)(\/.*)?$/);
    if (match) {
      if (!hasWorkspace || projects.length === 0) {
        router.replace("/dashboard");
        return;
      }

      const param = decodeURIComponent(match[1]);
      const subpath = match[2] ?? "";
      const project = resolveProjectFromParam(projects, param);
      if (!project) {
        const fallback = projects[0]!;
        router.replace(`${projectPath(fallback.key)}${subpath || "/board"}`);
        return;
      }
      setCurrentProject(project);
      return;
    }

    if (projects.length === 0) return;

    const current = useAppStore.getState().currentProject;
    const stillValid = projects.some((p) => p.id === current.id);
    if (!stillValid && projects[0]) {
      setCurrentProject(projects[0]);
    }
  }, [
    pathname,
    projects,
    hydrated,
    hasWorkspace,
    setCurrentProject,
    router,
  ]);

  return null;
}
