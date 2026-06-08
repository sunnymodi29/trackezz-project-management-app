// ==========================================
// TrackEzz - Core Type Definitions
// ==========================================

export type Priority = "urgent" | "high" | "medium" | "low" | "none";
export type IssueType =
  | "task"
  | "bug"
  | "feature"
  | "improvement"
  | "epic"
  | "story";
/** Workflow status key (built-in defaults or per-project custom). */
export type IssueStatus = string;

export interface WorkflowStatus {
  id: string;
  projectId: string;
  key: string;
  label: string;
  color: string;
  position: number;
  createdAt: Date;
}
export type Severity = "critical" | "major" | "minor" | "trivial";
export type OrganizationRole = "owner" | "project_admin";
export type ProjectRole = "project_admin" | "member";
export type SprintStatus = "planning" | "active" | "completed";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
  color: string;
  icon: string;
  organizationId: string;
  leadId?: string;
  lead?: User;
  issueCount: number;
  issueCounter: number;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  user: User;
}

export interface Issue {
  id: string;
  issueKey: string; // e.g., "PROJ-123"
  title: string;
  description?: string;
  type: IssueType;
  status: IssueStatus;
  priority: Priority;
  severity?: Severity;
  reporterId: string;
  reporter?: User;
  assigneeIds: string[];
  assignees: User[];
  projectId: string;
  project?: Project;
  sprintId?: string;
  sprint?: Sprint;
  epicId?: string;
  epic?: Epic;
  estimate?: number;
  dueDate?: Date;
  labels: Label[];
  environment?: string;
  reproductionSteps?: string;
  expectedResult?: string;
  actualResult?: string;
  attachments: Attachment[];
  comments: Comment[];
  subIssues?: Issue[];
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate: Date;
  endDate: Date;
  projectId: string;
  issueCount: number;
  completedCount: number;
}

export interface Epic {
  id: string;
  name: string;
  description?: string;
  color: string;
  projectId: string;
  progress: number;
  issueCount: number;
  completedCount: number;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: User;
  issueId: string;
  parentId?: string;
  reactions: Reaction[];
  replies?: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: User;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  issueId: string;
  uploadedById: string;
  uploadedBy: User;
  createdAt: Date;
}

export interface NotificationInvitation {
  id: string;
  token: string;
  email: string;
  organizationId?: string;
  projectId?: string;
  organizationRole?: OrganizationRole;
  projectRole?: ProjectRole;
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
}

export interface Notification {
  id: string;
  type:
    | "mention"
    | "assign"
    | "comment"
    | "status_change"
    | "sprint"
    | "invitation";
  title: string;
  message: string;
  read: boolean;
  userId: string;
  issueId?: string;
  issue?: Issue;
  invitationId?: string;
  invitation?: NotificationInvitation;
  actorId: string;
  actor: User;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  userId: string;
  user: User;
  issueId?: string;
  projectId?: string;
  createdAt: Date;
}

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  projectId: string;
  userId: string;
  isShared: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  token?: string;
  organizationId?: string;
  projectId?: string;
  organizationRole?: OrganizationRole;
  projectRole?: ProjectRole;
  invitedById: string;
  invitedBy: User;
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
  createdAt: Date;
}

/** Client-side permission hints from bootstrap */
export interface UserPermissions {
  isOrgOwner: boolean;
  isOrgProjectAdmin: boolean;
  canCreateProject: boolean;
  canInviteOrgProjectAdmin: boolean;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  projectId: string;
  userId: string;
  createdAt: Date;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  conversationId: string;
  createdAt: Date;
}

// Board / Kanban Types
export interface BoardColumn {
  id: string;
  title: string;
  issues: Issue[];
}

// Analytics Types
export interface ProjectStats {
  totalIssues: number;
  completedIssues: number;
  openBugs: number;
  activeSprints: number;
  teamMembers: number;
  completionRate: number;
  avgResolutionTime: string;
  issuesByPriority: Record<Priority, number>;
  issuesByStatus: Record<string, number>;
  issuesByType: Record<IssueType, number>;
  recentActivity: ActivityLog[];
  burndownData: { date: string; remaining: number; ideal: number }[];
}

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}
