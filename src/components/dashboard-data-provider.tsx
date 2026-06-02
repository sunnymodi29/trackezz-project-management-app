"use client";

import { useEffect } from "react";
import type { BootstrapData } from "@/lib/queries/bootstrap";
import { useDataStore } from "@/store/data-store";
import { useAppStore } from "@/store/app-store";
import { WorkspaceCookieSync } from "@/components/workspace-cookie-sync";

export function DashboardDataProvider({
  data,
  children,
}: {
  data: BootstrapData;
  children: React.ReactNode;
}) {
  const hydrate = useDataStore((s) => s.hydrate);
  const { projects } = data;

  useEffect(() => {
    hydrate(data);
    if (!data.hasWorkspace || projects.length === 0) return;
    const app = useAppStore.getState();
    const valid = projects.some((p) => p.id === app.currentProject.id);
    if (!valid && projects[0]) {
      app.setCurrentProject(projects[0]);
    }
  }, [data, hydrate, projects]);

  return (
    <>
      <WorkspaceCookieSync hasWorkspace={data.hasWorkspace} />
      {children}
    </>
  );
}
