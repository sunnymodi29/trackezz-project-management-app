"use client";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { CommandPalette } from "@/components/command-palette";
import { NewIssueModal } from "@/components/new-issue-modal";
import { NewProjectModal } from "@/components/new-project-modal";
import { ProjectRouteSync } from "@/components/project-route-sync";
import { ProjectSwitchSync } from "@/components/project-switch-sync";
import { ProjectSwitchOverlay } from "@/components/project-switch-overlay";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, newProjectModalOpen, closeNewProject } = useAppStore();

  return (
    <div className="min-h-screen bg-background flex w-full overflow-x-hidden">
      <ProjectRouteSync />
      <ProjectSwitchSync />
      <Sidebar />

      {/* Main Content */}
      <main
        className={cn(
          "min-w-0 transition-all duration-200 w-full overflow-x-hidden",
          sidebarCollapsed ? "md:pl-14" : "md:pl-60"
        )}
      >
        <Topbar />
        <div className="relative min-h-[calc(100dvh-56px)] overflow-x-hidden pt-14 pb-[calc(72px+env(safe-area-inset-bottom))] md:pt-0 md:pb-0">
          {children}
        </div>
      </main>

      <MobileBottomNav />

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
