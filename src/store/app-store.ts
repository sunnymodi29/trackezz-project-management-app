"use client";

import { create } from "zustand";
import { projectPath } from "@/lib/projects/route";
import type { Issue, Project } from "@/types";

export type ProjectSwitchState = {
  active: boolean;
  project: Project | null;
  targetPrefix: string | null;
  startedAt: number;
};

export type RouteTransitionState = {
  active: boolean;
  targetPath: string | null;
  startedAt: number;
};

const emptyProject: Project = {
  id: "",
  name: "",
  key: "",
  color: "#6366f1",
  icon: "📁",
  organizationId: "",
  issueCount: 0,
  issueCounter: 0,
  memberCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

interface AppState {
  currentProject: Project;
  setCurrentProject: (project: Project) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  selectedIssue: Issue | null;
  issueModalOpen: boolean;
  openIssue: (issue: Issue) => void;
  closeIssue: () => void;

  newIssueModalOpen: boolean;
  newIssueDefaultDueDate: Date | null;
  openNewIssue: (dueDate?: Date) => void;
  closeNewIssue: () => void;

  newProjectModalOpen: boolean;
  openNewProject: () => void;
  closeNewProject: () => void;

  newIssueType: string;
  setNewIssueType: (type: string) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  projectSwitch: ProjectSwitchState;
  beginProjectSwitch: (project: Project) => void;
  endProjectSwitch: () => void;

  routeTransition: RouteTransitionState;
  beginRouteTransition: (targetPath: string) => void;
  endRouteTransition: () => void;
}

const idleProjectSwitch: ProjectSwitchState = {
  active: false,
  project: null,
  targetPrefix: null,
  startedAt: 0,
};

const idleRouteTransition: RouteTransitionState = {
  active: false,
  targetPath: null,
  startedAt: 0,
};

export const useAppStore = create<AppState>((set) => ({
  currentProject: emptyProject,
  setCurrentProject: (project) => set({ currentProject: project }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  selectedIssue: null,
  issueModalOpen: false,
  openIssue: (issue) => set({ selectedIssue: issue, issueModalOpen: true }),
  closeIssue: () => set({ issueModalOpen: false, selectedIssue: null }),

  newIssueModalOpen: false,
  newIssueDefaultDueDate: null,
  openNewIssue: (dueDate) =>
    set({
      newIssueModalOpen: true,
      newIssueDefaultDueDate: dueDate instanceof Date ? dueDate : null,
    }),
  closeNewIssue: () =>
    set({ newIssueModalOpen: false, newIssueDefaultDueDate: null }),

  newProjectModalOpen: false,
  openNewProject: () => set({ newProjectModalOpen: true }),
  closeNewProject: () => set({ newProjectModalOpen: false }),

  newIssueType: "task",
  setNewIssueType: (type) => set({ newIssueType: type }),

  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),

  projectSwitch: idleProjectSwitch,
  beginProjectSwitch: (project) =>
    set({
      projectSwitch: {
        active: true,
        project,
        targetPrefix: projectPath(project.key),
        startedAt: Date.now(),
      },
    }),
  endProjectSwitch: () => set({ projectSwitch: idleProjectSwitch }),

  routeTransition: idleRouteTransition,
  beginRouteTransition: (targetPath) =>
    set({
      routeTransition: {
        active: true,
        targetPath,
        startedAt: Date.now(),
      },
    }),
  endRouteTransition: () => set({ routeTransition: idleRouteTransition }),
}));
