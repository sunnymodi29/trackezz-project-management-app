import { buildCommentTree } from "@/lib/comments/tree";
import type {
  SprintStatus as AppSprintStatus,
  User,
  Organization,
  OrganizationMember,
  Project,
  ProjectMember,
  ProjectRole as AppProjectRole,
  Issue,
  Sprint,
  Epic,
  Label,
  Comment,
  Reaction,
  Attachment,
  Notification,
  ActivityLog,
  Invitation,
  AIConversation,
  WorkflowStatus,
} from "@/types";
import type {
  User as DbUser,
  Organization as DbOrganization,
  OrganizationMember as DbOrganizationMember,
  OrganizationRole as DbOrganizationRole,
  Project as DbProject,
  ProjectMember as DbProjectMember,
  ProjectRole as DbProjectRole,
  Issue as DbIssue,
  Sprint as DbSprint,
  Epic as DbEpic,
  Label as DbLabel,
  Comment as DbComment,
  Reaction as DbReaction,
  Attachment as DbAttachment,
  Notification as DbNotification,
  ActivityLog as DbActivityLog,
  Invitation as DbInvitation,
  AIConversation as DbAIConversation,
  AIMessage as DbAIMessage,
  WorkflowStatus as DbWorkflowStatus,
  SprintStatus,
} from "@/generated/prisma/client";

export function toAppSprintStatus(status: SprintStatus): AppSprintStatus {
  return status as AppSprintStatus;
}

export function serializeUser(user: DbUser): User {
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    avatarUrl: user.image ?? user.avatarUrl ?? undefined,
    createdAt: user.createdAt,
  };
}

export function serializeOrganization(org: DbOrganization): Organization {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    ownerId: org.ownerId,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

export function serializeOrganizationMember(
  member: DbOrganizationMember & { user: DbUser }
): OrganizationMember {
  return {
    id: member.id,
    userId: member.userId,
    organizationId: member.organizationId,
    role: member.role as OrganizationMember["role"],
    user: serializeUser(member.user),
  };
}

export function toDbProjectRole(role: AppProjectRole): DbProjectRole {
  return role as DbProjectRole;
}

export function fromDbProjectRole(role: DbProjectRole): AppProjectRole {
  return role as AppProjectRole;
}

export function toDbOrganizationRole(
  role: import("@/types").OrganizationRole
): DbOrganizationRole {
  return role as DbOrganizationRole;
}

export function serializeProjectMember(
  member: DbProjectMember & { user: DbUser }
): ProjectMember {
  return {
    id: member.id,
    userId: member.userId,
    projectId: member.projectId,
    role: fromDbProjectRole(member.role),
    user: serializeUser(member.user),
  };
}

export function serializeProject(
  project: DbProject & {
    lead?: DbUser | null;
    _count?: { issues: number; members?: number };
  },
  memberCount?: number
): Project {
  const issueCount = project._count?.issues ?? 0;
  const members = memberCount ?? project._count?.members ?? 0;
  return {
    id: project.id,
    name: project.name,
    key: project.key,
    description: project.description ?? undefined,
    color: project.color,
    icon: project.icon,
    organizationId: project.organizationId,
    leadId: project.leadId ?? undefined,
    lead: project.lead ? serializeUser(project.lead) : undefined,
    issueCount,
    issueCounter: project.issueCounter,
    memberCount: members,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function serializeLabel(label: DbLabel): Label {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    projectId: label.projectId,
  };
}

export function serializeWorkflowStatus(row: DbWorkflowStatus): WorkflowStatus {
  return {
    id: row.id,
    projectId: row.projectId,
    key: row.key,
    label: row.label,
    color: row.color,
    position: row.position,
    createdAt: row.createdAt,
  };
}

export function serializeSprint(
  sprint: DbSprint & { _count?: { issues: number }; issues?: { status: string }[] }
): Sprint {
  const issues = sprint.issues ?? [];
  const issueCount = sprint._count?.issues ?? issues.length;
  const completedCount = issues.filter((i) => i.status === "done").length;

  return {
    id: sprint.id,
    name: sprint.name,
    goal: sprint.goal ?? undefined,
    status: toAppSprintStatus(sprint.status),
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    projectId: sprint.projectId,
    issueCount,
    completedCount,
  };
}

export function serializeEpic(
  epic: DbEpic & { issues?: { status: string }[] }
): Epic {
  const issues = epic.issues ?? [];
  const issueCount = issues.length;
  const completedCount = issues.filter((i) => i.status === "done").length;
  const progress = issueCount > 0 ? Math.round((completedCount / issueCount) * 100) : 0;

  return {
    id: epic.id,
    name: epic.name,
    description: epic.description ?? undefined,
    color: epic.color,
    projectId: epic.projectId,
    progress,
    issueCount,
    completedCount,
  };
}

export function serializeReaction(
  reaction: DbReaction & { user: DbUser }
): Reaction {
  return {
    id: reaction.id,
    emoji: reaction.emoji,
    userId: reaction.userId,
    user: serializeUser(reaction.user),
  };
}

export function serializeComment(
  comment: DbComment & {
    author: DbUser;
    reactions: (DbReaction & { user: DbUser })[];
  }
): Comment {
  return {
    id: comment.id,
    content: comment.content,
    authorId: comment.authorId,
    author: serializeUser(comment.author),
    issueId: comment.issueId,
    parentId: comment.parentId ?? undefined,
    reactions: comment.reactions.map(serializeReaction),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

export function serializeAttachment(
  attachment: DbAttachment & { uploadedBy: DbUser }
): Attachment {
  return {
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
    size: attachment.size,
    type: attachment.type,
    issueId: attachment.issueId,
    uploadedById: attachment.uploadedById,
    uploadedBy: serializeUser(attachment.uploadedBy),
    createdAt: attachment.createdAt,
  };
}

type FullIssue = DbIssue & {
  reporter: DbUser;
  assignees: { user: DbUser }[];
  labels: { label: DbLabel }[];
  project: DbProject & { lead?: DbUser | null };
  sprint?: DbSprint | null;
  epic?: DbEpic | null;
  comments: (DbComment & { author: DbUser; reactions: (DbReaction & { user: DbUser })[] })[];
  attachments: (DbAttachment & { uploadedBy: DbUser })[];
};

export function serializeIssue(issue: FullIssue): Issue {
  return {
    id: issue.id,
    issueKey: issue.issueKey,
    title: issue.title,
    description: issue.description ?? undefined,
    type: issue.type,
    status: issue.status,
    priority: issue.priority,
    severity: issue.severity ?? undefined,
    reporterId: issue.reporterId,
    reporter: serializeUser(issue.reporter),
    assigneeIds: issue.assignees.map((a) => a.user.id),
    assignees: issue.assignees.map((a) => serializeUser(a.user)),
    projectId: issue.projectId,
    project: serializeProject(issue.project),
    sprintId: issue.sprintId ?? undefined,
    sprint: issue.sprint ? serializeSprint(issue.sprint) : undefined,
    epicId: issue.epicId ?? undefined,
    epic: issue.epic ? serializeEpic(issue.epic) : undefined,
    estimate: issue.estimate ?? undefined,
    dueDate: issue.dueDate ?? undefined,
    labels: issue.labels.map((l) => serializeLabel(l.label)),
    environment: issue.environment ?? undefined,
    reproductionSteps: issue.reproductionSteps ?? undefined,
    expectedResult: issue.expectedResult ?? undefined,
    actualResult: issue.actualResult ?? undefined,
    attachments: issue.attachments.map(serializeAttachment),
    comments: buildCommentTree(issue.comments.map(serializeComment)),
    parentId: issue.parentId ?? undefined,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

export function serializeNotification(
  notification: DbNotification & {
    actor: DbUser;
    issue?: FullIssue | null;
    invitation?: {
      id: string;
      token: string;
      email: string;
      organizationId: string | null;
      projectId: string | null;
      organizationRole: import("@/generated/prisma/client").OrganizationRole | null;
      projectRole: import("@/generated/prisma/client").ProjectRole | null;
      status: import("@/generated/prisma/client").InvitationStatus;
      expiresAt: Date;
    } | null;
  }
): Notification {
  return {
    id: notification.id,
    type: notification.type as Notification["type"],
    title: notification.title,
    message: notification.message,
    read: notification.read,
    userId: notification.userId,
    issueId: notification.issueId ?? undefined,
    issue: notification.issue ? serializeIssue(notification.issue) : undefined,
    invitationId: notification.invitationId ?? undefined,
    invitation: notification.invitation
      ? {
          id: notification.invitation.id,
          token: notification.invitation.token,
          email: notification.invitation.email,
          organizationId: notification.invitation.organizationId ?? undefined,
          projectId: notification.invitation.projectId ?? undefined,
          organizationRole: notification.invitation.organizationRole ?? undefined,
          projectRole: notification.invitation.projectRole ?? undefined,
          status: notification.invitation.status,
          expiresAt: notification.invitation.expiresAt,
        }
      : undefined,
    actorId: notification.actorId,
    actor: serializeUser(notification.actor),
    createdAt: notification.createdAt,
  };
}

export function serializeActivityLog(
  log: DbActivityLog & { user: DbUser }
): ActivityLog {
  return {
    id: log.id,
    action: log.action,
    details: log.details,
    userId: log.userId,
    user: serializeUser(log.user),
    issueId: log.issueId ?? undefined,
    projectId: log.projectId ?? undefined,
    createdAt: log.createdAt,
  };
}

export function serializeInvitation(
  invitation: DbInvitation & { invitedBy: DbUser },
  options?: { includeToken?: boolean }
): Invitation {
  return {
    id: invitation.id,
    email: invitation.email,
    ...(options?.includeToken ? { token: invitation.token } : {}),
    organizationId: invitation.organizationId ?? undefined,
    projectId: invitation.projectId ?? undefined,
    organizationRole: invitation.organizationRole ?? undefined,
    projectRole: invitation.projectRole ?? undefined,
    invitedById: invitation.invitedById,
    invitedBy: serializeUser(invitation.invitedBy),
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  };
}

export function serializeAIConversation(
  conversation: DbAIConversation & { messages: DbAIMessage[] }
): AIConversation {
  return {
    id: conversation.id,
    title: conversation.title,
    projectId: conversation.projectId,
    userId: conversation.userId,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      conversationId: m.conversationId,
      createdAt: m.createdAt,
    })),
    createdAt: conversation.createdAt,
  };
}
