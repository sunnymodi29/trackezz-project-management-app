"use client";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { CommandPalette } from "@/components/command-palette";
import { NewIssueModal } from "@/components/new-issue-modal";
import { NewProjectModal } from "@/components/new-project-modal";
import { ProjectRouteSync } from "@/components/project-route-sync";
import { ProjectSwitchSync } from "@/components/project-switch-sync";
import { ProjectSwitchOverlay } from "@/components/project-switch-overlay";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, newProjectModalOpen, closeNewProject } = useAppStore();

  return (
    <div className="min-h-screen bg-background flex w-full">
      <ProjectRouteSync />
      <ProjectSwitchSync />
      <Sidebar />

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-200 w-full",
          sidebarCollapsed ? "pl-14" : "pl-60"
        )}
      >
        <Topbar />
        <div className="relative min-h-[calc(100vh-56px)]">{children}</div>
      </main>

      <ProjectSwitchOverlay />

      {/* Global modals */}
      <CommandPalette />
      <NewIssueModal />
      <NewProjectModal
        open={newProjectModalOpen}
        onClose={closeNewProject}
      />
    </div>
  );
}
