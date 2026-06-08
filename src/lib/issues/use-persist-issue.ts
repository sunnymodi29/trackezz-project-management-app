"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateIssue,
  patchIssueFields,
  type UpdateIssueInput,
} from "@/lib/actions/issues";
import { isQuickIssuePatch } from "@/lib/issues/quick-patch";
import { useDataStore } from "@/store/data-store";
import type { Issue } from "@/types";

export function usePersistIssue() {
  const router = useRouter();
  const upsertIssue = useDataStore((s) => s.upsertIssue);
  const patchIssue = useDataStore((s) => s.patchIssue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    async (issueId: string, input: UpdateIssueInput): Promise<Issue | null> => {
      const existing = useDataStore.getState().issues.find((i) => i.id === issueId);
      if (!existing) return null;

      setSaving(true);
      setError(null);

      const optimistic: Issue = {
        ...existing,
        ...input,
        updatedAt: new Date(),
      };
      upsertIssue(optimistic);

      try {
        if (isQuickIssuePatch(input)) {
          const patch = await patchIssueFields(issueId, input);
          patchIssue(issueId, patch);
          return { ...existing, ...patch };
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
    [router, upsertIssue, patchIssue],
  );

  return { persist, saving, error };
}
