"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateIssue,
  patchIssueFields,
  type UpdateIssueInput,
} from "@/lib/actions/issues";
import { isQuickIssuePatch } from "@/lib/issues/quick-patch";
import { resolveAssigneesFromIds, getProjectUsers } from "@/lib/issues/assignee-select";
import { useDataStore } from "@/store/data-store";
import type { Issue } from "@/types";

function applyOptimisticPatch(existing: Issue, input: UpdateIssueInput): Issue {
  const next: Issue = { ...existing, updatedAt: new Date() };
  if (input.title !== undefined) next.title = input.title;
  if (input.description !== undefined) next.description = input.description;
  if (input.status !== undefined) next.status = input.status;
  if (input.priority !== undefined) next.priority = input.priority;
  if (input.assigneeIds !== undefined) {
    next.assigneeIds = input.assigneeIds;
    const users = getProjectUsers(
      useDataStore.getState().projectMembers,
      existing.projectId,
    );
    next.assignees = resolveAssigneesFromIds(users, input.assigneeIds);
  }
  if (input.dueDate !== undefined) {
    next.dueDate = input.dueDate ?? undefined;
  }
  if (input.sprintId !== undefined) {
    next.sprintId = input.sprintId ?? undefined;
    if (!input.sprintId) {
      next.sprint = undefined;
    } else {
      next.sprint = useDataStore
        .getState()
        .sprints.find((sprint) => sprint.id === input.sprintId);
    }
  }
  if (input.parentId !== undefined) {
    next.parentId = input.parentId ?? undefined;
  }
  return next;
}

export function usePersistIssue() {
  const router = useRouter();
  const upsertIssue = useDataStore((s) => s.upsertIssue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    async (issueId: string, input: UpdateIssueInput): Promise<Issue | null> => {
      const existing = useDataStore.getState().issues.find((i) => i.id === issueId);
      if (!existing) return null;

      setSaving(true);
      setError(null);

      const optimistic = applyOptimisticPatch(existing, input);
      upsertIssue(optimistic);

      try {
        if (isQuickIssuePatch(input)) {
          const patch = await patchIssueFields(issueId, input);
          const merged: Issue = {
            ...optimistic,
            ...patch,
            dueDate:
              patch.dueDate !== undefined
                ? (patch.dueDate ?? undefined)
                : optimistic.dueDate,
            sprintId:
              patch.sprintId !== undefined
                ? (patch.sprintId ?? undefined)
                : optimistic.sprintId,
            parentId:
              patch.parentId !== undefined
                ? (patch.parentId ?? undefined)
                : optimistic.parentId,
          };
          upsertIssue(merged);
          return merged;
        }

        const updated = await updateIssue(issueId, input);
        upsertIssue(updated);
        router.refresh();
        return updated;
      } catch (e) {
        upsertIssue(existing);
        const message = e instanceof Error ? e.message : "Failed to save";
        setError(message);
        console.error(message);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [router, upsertIssue],
  );

  return { persist, saving, error };
}
