"use client";

import { useCallback, useMemo } from "react";
import { buildAssigneeFilterOptions } from "@/lib/issues/filters";
import {
  buildAssigneeSelectOptions,
  getProjectUsers,
  resolveAssigneesFromIds,
} from "@/lib/issues/assignee-select";
import { useDataStore } from "@/store/data-store";

export function useProjectAssigneeSelect(projectId: string | undefined) {
  const projectMembers = useDataStore((s) => s.projectMembers);

  const users = useMemo(
    () => (projectId ? getProjectUsers(projectMembers, projectId) : []),
    [projectMembers, projectId],
  );

  const assigneeOptions = useMemo(
    () => buildAssigneeSelectOptions(users),
    [users],
  );

  const assigneeFilterOptions = useMemo(
    () => buildAssigneeFilterOptions(users),
    [users],
  );

  const getSelectedAssignees = useCallback(
    (assigneeIds: string[]) => resolveAssigneesFromIds(users, assigneeIds),
    [users],
  );

  return {
    users,
    assigneeOptions,
    assigneeFilterOptions,
    getSelectedAssignees,
  };
}
