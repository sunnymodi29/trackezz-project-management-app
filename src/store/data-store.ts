"use client";

import { create } from "zustand";
import type { BootstrapData } from "@/lib/queries/bootstrap";
import { refreshSprintCounts } from "@/lib/sprints/counts";
import { sortWorkflowStatuses } from "@/lib/projects/workflow-status";
import type {
  ActivityLog,
  Issue,
  Notification,
  Organization,
  Project,
  ProjectMember,
  Sprint,
  User,
  WorkflowStatus,
} from "@/types";

interface DataState extends BootstrapData {
  hydrated: boolean;
  hydrate: (data: BootstrapData) => void;
  setIssues: (issues: Issue[]) => void;
  upsertIssue: (issue: Issue) => void;
  patchIssue: (
    issueId: string,
    patch: Partial<Pick<Issue, "status" | "priority" | "updatedAt">>,
  ) => void;
  removeIssue: (issueId: string) => void;
  upsertSprint: (sprint: Sprint) => void;
  removeSprint: (sprintId: string) => void;
  patchProject: (
    projectId: string,
    patch: Partial<Pick<Project, "issueCounter" | "issueCount" | "memberCount">>
  ) => void;
  upsertProject: (project: Project) => void;
  patchOrganization: (patch: Partial<Pick<Organization, "name">>) => void;
  patchCurrentUser: (patch: Partial<Pick<User, "name" | "avatarUrl">>) => void;
  removeProject: (projectId: string) => void;
  upsertProjectMember: (member: ProjectMember) => void;
  removeProjectMember: (projectId: string, userId: string) => void;
  getProjectMembers: (projectId: string) => ProjectMember[];
  prependActivityLog: (log: ActivityLog) => void;
  getActivityLogsForIssue: (issueId: string) => ActivityLog[];
  setCurrentProjectById: (projectId: string) => void;
  getUnreadNotificationCount: () => number;
  upsertNotification: (notification: Notification) => void;
  patchNotification: (notificationId: string, patch: Partial<Pick<Notification, "read">>) => void;
  removeNotification: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  getIssuesByProject: (projectId: string) => Issue[];
  getMyIssues: () => Issue[];
  getWorkflowStatuses: (projectId: string) => WorkflowStatus[];
  upsertWorkflowStatus: (status: WorkflowStatus) => void;
  removeWorkflowStatus: (projectId: string, statusKey: string) => void;
  patchIssueStatusBulk: (
    projectId: string,
    fromKey: string,
    toKey: string,
  ) => void;
}

const emptyBootstrap: BootstrapData = {
  hasWorkspace: false,
  currentUser: { id: "", name: "", email: "", createdAt: new Date() },
  organization: null,
  organizationMembers: [],
  permissions: {
    isOrgOwner: false,
    isOrgProjectAdmin: false,
    canCreateProject: false,
    canInviteOrgProjectAdmin: false,
  },
  projects: [],
  projectMembers: [],
  issues: [],
  sprints: [],
  epics: [],
  labels: [],
  notifications: [],
  activityLogs: [],
  invitations: [],
  aiConversations: [],
  workflowStatuses: [],
};

export const useDataStore = create<DataState>((set, get) => ({
  ...emptyBootstrap,
  hydrated: false,

  hydrate: (data) =>
    set({
      ...data,
      hydrated: true,
    }),

  setIssues: (issues) => set({ issues }),

  upsertIssue: (issue) =>
    set((state) => {
      const exists = state.issues.some((i) => i.id === issue.id);
      const issues = exists
        ? state.issues.map((i) => (i.id === issue.id ? issue : i))
        : [issue, ...state.issues];
      return {
        issues,
        sprints: refreshSprintCounts(state.sprints, issues),
      };
    }),

  patchIssue: (issueId, patch) =>
    set((state) => {
      const issues = state.issues.map((i) =>
        i.id === issueId ? { ...i, ...patch } : i,
      );
      return {
        issues,
        sprints: refreshSprintCounts(state.sprints, issues),
      };
    }),

  upsertSprint: (sprint) =>
    set((state) => {
      const exists = state.sprints.some((s) => s.id === sprint.id);
      const sprints = exists
        ? state.sprints.map((s) => (s.id === sprint.id ? sprint : s))
        : [...state.sprints, sprint];
      return {
        sprints: refreshSprintCounts(sprints, state.issues),
      };
    }),

  removeSprint: (sprintId) =>
    set((state) => {
      const issues = state.issues.map((i) =>
        i.sprintId === sprintId
          ? { ...i, sprintId: undefined, sprint: undefined }
          : i
      );
      const sprints = state.sprints.filter((s) => s.id !== sprintId);
      return {
        sprints: refreshSprintCounts(sprints, issues),
        issues,
      };
    }),

  removeIssue: (issueId) =>
    set((state) => {
      const removed = state.issues.find((i) => i.id === issueId);
      const projects = removed
        ? state.projects.map((p) =>
            p.id === removed.projectId
              ? { ...p, issueCount: Math.max(0, p.issueCount - 1) }
              : p
          )
        : state.projects;
      if (removed) {
        import("@/store/app-store").then(({ useAppStore }) => {
          const app = useAppStore.getState();
          if (app.currentProject.id === removed.projectId) {
            const updated = projects.find((p) => p.id === removed.projectId);
            if (updated) app.setCurrentProject(updated);
          }
        });
      }
      const issues = state.issues.filter((i) => i.id !== issueId);
      return {
        issues,
        sprints: refreshSprintCounts(state.sprints, issues),
        activityLogs: state.activityLogs.filter((l) => l.issueId !== issueId),
        notifications: state.notifications.filter((n) => n.issueId !== issueId),
        projects,
      };
    }),

  upsertProject: (project) =>
    set((state) => {
      const exists = state.projects.some((p) => p.id === project.id);
      const projects = exists
        ? state.projects.map((p) => (p.id === project.id ? project : p))
        : [...state.projects, project];
      return { projects };
    }),

  patchOrganization: (patch) =>
    set((state) => ({
      organization: state.organization
        ? { ...state.organization, ...patch }
        : null,
    })),

  patchCurrentUser: (patch) =>
    set((state) => {
      const userId = state.currentUser.id;
      const syncUser = (u: User) =>
        u.id === userId ? { ...u, ...patch } : u;
      return {
        currentUser: { ...state.currentUser, ...patch },
        organizationMembers: state.organizationMembers.map((m) =>
          m.userId === userId ? { ...m, user: syncUser(m.user) } : m
        ),
        projectMembers: state.projectMembers.map((m) =>
          m.userId === userId ? { ...m, user: syncUser(m.user) } : m
        ),
      };
    }),

  removeProject: (projectId) =>
    set((state) => {
      const projects = state.projects.filter((p) => p.id !== projectId);
      import("@/store/app-store").then(({ useAppStore }) => {
        const app = useAppStore.getState();
        if (app.currentProject.id === projectId && projects[0]) {
          app.setCurrentProject(projects[0]);
        }
      });
      return {
        projects,
        issues: state.issues.filter((i) => i.projectId !== projectId),
        sprints: state.sprints.filter((s) => s.projectId !== projectId),
        labels: state.labels.filter((l) => l.projectId !== projectId),
        epics: state.epics.filter((e) => e.projectId !== projectId),
        projectMembers: state.projectMembers.filter(
          (m) => m.projectId !== projectId
        ),
        workflowStatuses: state.workflowStatuses.filter(
          (s) => s.projectId !== projectId
        ),
      };
    }),

  upsertProjectMember: (member) =>
    set((state) => {
      const exists = state.projectMembers.some(
        (m) => m.projectId === member.projectId && m.userId === member.userId
      );
      const projectMembers = exists
        ? state.projectMembers.map((m) =>
            m.projectId === member.projectId && m.userId === member.userId
              ? member
              : m
          )
        : [...state.projectMembers, member];
      const projects = state.projects.map((p) =>
        p.id === member.projectId && !exists
          ? { ...p, memberCount: p.memberCount + 1 }
          : p
      );
      return { projectMembers, projects };
    }),

  removeProjectMember: (projectId, userId) =>
    set((state) => {
      const had = state.projectMembers.some(
        (m) => m.projectId === projectId && m.userId === userId
      );
      return {
        projectMembers: state.projectMembers.filter(
          (m) => !(m.projectId === projectId && m.userId === userId)
        ),
        projects: had
          ? state.projects.map((p) =>
              p.id === projectId
                ? { ...p, memberCount: Math.max(0, p.memberCount - 1) }
                : p
            )
          : state.projects,
      };
    }),

  getProjectMembers: (projectId) =>
    get().projectMembers.filter((m) => m.projectId === projectId),

  patchProject: (projectId, patch) =>
    set((state) => {
      const projects = state.projects.map((p) =>
        p.id === projectId ? { ...p, ...patch } : p
      );
      import("@/store/app-store").then(({ useAppStore }) => {
        const app = useAppStore.getState();
        if (app.currentProject.id === projectId) {
          const updated = projects.find((p) => p.id === projectId);
          if (updated) app.setCurrentProject(updated);
        }
      });
      return { projects };
    }),

  prependActivityLog: (log) =>
    set((state) => ({
      activityLogs: [log, ...state.activityLogs].slice(0, 100),
    })),

  getActivityLogsForIssue: (issueId) =>
    get()
      .activityLogs.filter((l) => l.issueId === issueId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),

  setCurrentProjectById: (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (project) {
      import("@/store/app-store").then(({ useAppStore }) => {
        useAppStore.getState().setCurrentProject(project);
      });
    }
  },

  getUnreadNotificationCount: () =>
    get().notifications.filter((n) => !n.read).length,

  upsertNotification: (notification) =>
    set((state) => {
      const exists = state.notifications.some((n) => n.id === notification.id);
      const notifications = exists
        ? state.notifications.map((n) =>
            n.id === notification.id ? notification : n
          )
        : [notification, ...state.notifications];
      return { notifications: notifications.slice(0, 100) };
    }),

  patchNotification: (notificationId, patch) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, ...patch } : n
      ),
    })),

  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    })),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  getIssuesByProject: (projectId) =>
    get().issues.filter((i) => i.projectId === projectId),

  getMyIssues: () =>
    get().issues.filter((i) =>
      i.assigneeIds.includes(get().currentUser.id)
    ),

  getWorkflowStatuses: (projectId) =>
    sortWorkflowStatuses(
      get().workflowStatuses.filter((s) => s.projectId === projectId),
    ),

  upsertWorkflowStatus: (status) =>
    set((state) => {
      const exists = state.workflowStatuses.some((s) => s.id === status.id);
      const workflowStatuses = exists
        ? state.workflowStatuses.map((s) => (s.id === status.id ? status : s))
        : [...state.workflowStatuses, status];
      return { workflowStatuses: sortWorkflowStatuses(workflowStatuses) };
    }),

  removeWorkflowStatus: (projectId, statusKey) =>
    set((state) => ({
      workflowStatuses: state.workflowStatuses.filter(
        (s) => !(s.projectId === projectId && s.key === statusKey),
      ),
    })),

  patchIssueStatusBulk: (projectId, fromKey, toKey) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.projectId === projectId && i.status === fromKey
          ? { ...i, status: toKey, updatedAt: new Date() }
          : i
      ),
    })),
}));
