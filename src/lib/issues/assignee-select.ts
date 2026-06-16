import type { CustomSelectOption } from "@/components/ui/custom-select";
import type { ProjectMember, User } from "@/types";

export function getProjectUsers(
  projectMembers: ProjectMember[],
  projectId: string,
): User[] {
  return projectMembers
    .filter((member) => member.projectId === projectId)
    .map((member) => member.user);
}

export function buildAssigneeSelectOptions(users: User[]): CustomSelectOption[] {
  return users.map((user) => ({
    value: user.id,
    label: user.name,
    avatarUrl: user.avatarUrl,
    showAvatar: true,
  }));
}

export function resolveAssigneesFromIds(
  users: User[],
  assigneeIds: string[],
): User[] {
  const usersById = new Map(users.map((user) => [user.id, user]));
  return assigneeIds
    .map((id) => usersById.get(id))
    .filter((user): user is User => !!user);
}
