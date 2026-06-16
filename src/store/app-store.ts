"use client";

import { create } from "zustand";
import { projectPath } from "@/lib/projects/route";
import type { Issue, IssueStatus, Project } from "@/types";

export type OpenNewIssueOptions = {
  dueDate?: Date;
  status?: IssueStatus;
};

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
  /** Full viewport overlay (e.g. landing → dashboard). */
  fullScreen: boolean;
  /** False until dashboard bootstrap hydrates for this navigation. */
  bootstrapReady: boolean;
};

export type BeginRouteTransitionOptions = {
  fullScreen?: boolean;
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
  newIssueDefaultStatus: IssueStatus | null;
  openNewIssue: (options?: Date | OpenNewIssueOptions) => void;
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
  beginRouteTransition: (
    targetPath: string,
    options?: BeginRouteTransitionOptions,
  ) => void;
  markRouteBootstrapReady: () => void;
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
  fullScreen: false,
  bootstrapReady: true,
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
  newIssueDefaultStatus: null,
  openNewIssue: (options) => {
    const opts =
      options instanceof Date ? { dueDate: options } : (options ?? {});
    set({
      newIssueModalOpen: true,
      newIssueDefaultDueDate:
        opts.dueDate instanceof Date ? opts.dueDate : null,
      newIssueDefaultStatus: opts.status ?? null,
    });
  },
  closeNewIssue: () =>
    set({
      newIssueModalOpen: false,
      newIssueDefaultDueDate: null,
      newIssueDefaultStatus: null,
    }),

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
  beginRouteTransition: (targetPath, options) => {
    const fullScreen = options?.fullScreen ?? false;
    const targetingDashboard = targetPath.startsWith("/dashboard");
    set({
      routeTransition: {
        active: true,
        targetPath,
        startedAt: Date.now(),
        fullScreen,
        bootstrapReady: !targetingDashboard || !fullScreen,
      },
    });
  },
  markRouteBootstrapReady: () =>
    set((state) => {
      if (!state.routeTransition.active) return state;
      return {
        routeTransition: {
          ...state.routeTransition,
          bootstrapReady: true,
        },
      };
    }),
  endRouteTransition: () => set({ routeTransition: idleRouteTransition }),
}));
