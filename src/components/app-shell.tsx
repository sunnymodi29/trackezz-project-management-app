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
    <div className="flex min-h-screen w-full bg-background">
      <ProjectRouteSync />
      <ProjectSwitchSync />
      <Sidebar />

      {/* Main Content */}
      <main
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-all duration-200 w-full",
          sidebarCollapsed ? "md:pl-14" : "md:pl-60"
        )}
      >
        <Topbar />
        <div className="relative min-h-0 flex-1 overflow-x-hidden pt-14 pb-[calc(72px+env(safe-area-inset-bottom))] md:pt-0 md:pb-0">
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
