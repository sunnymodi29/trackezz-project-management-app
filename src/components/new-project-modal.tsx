"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2 } from "lucide-react";
import { Button, Input, Textarea, CustomSelect, Avatar } from "@/components/ui";
import { useDataStore } from "@/store/data-store";
import { createProject } from "@/lib/actions/projects";
import { deriveProjectKey } from "@/lib/projects/project-utils";
import { PROJECT_ROLE_OPTIONS } from "@/lib/projects/constants";
import type { ProjectRole } from "@/types";
import { cn } from "@/lib/utils";

interface DraftMember {
  userId: string;
  role: ProjectRole;
}

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewProjectModal({ open, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const { organization, organizationMembers, permissions, upsertProject, upsertProjectMember } =
    useDataStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [keyOverride, setKeyOverride] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const suggestedKey = useMemo(
    () => (keyOverride.trim() || deriveProjectKey(name)).toUpperCase(),
    [name, keyOverride]
  );

  const availableToAdd = useMemo(
    () =>
      organizationMembers.filter(
        (m) => !members.some((d) => d.userId === m.userId)
      ),
    [organizationMembers, members]
  );

  useEffect(() => {
    if (open) {
      setError(null);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, submitting, onClose]);

  const addMember = () => {
    if (!addUserId) return;
    setMembers((prev) => [...prev, { userId: addUserId, role: "member" }]);
    setAddUserId("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      titleRef.current?.focus();
      return;
    }
    if (!organization) {
      setError("No organization workspace available");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { project, members: createdMembers } = await createProject({
        organizationId: organization.id,
        name,
        description: description || undefined,
        key: keyOverride.trim() || undefined,
        members,
      });
      upsertProject(project);
      for (const m of createdMembers) upsertProjectMember(m);
      router.refresh();
      onClose();
      setName("");
      setDescription("");
      setKeyOverride("");
      setMembers([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  if (!permissions.canCreateProject) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">New project</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Key preview: {suggestedKey}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1 hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project name</label>
            <Input
              ref={titleRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Test Project"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Key (optional)</label>
            <Input
              value={keyOverride}
              onChange={(e) => setKeyOverride(e.target.value.toUpperCase())}
              placeholder={suggestedKey}
              className="font-mono uppercase"
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-sm font-medium">Team members</label>
            <p className="text-xs text-muted-foreground">
              You are added as project admin. Add more members below.
            </p>
            {members.map((m) => {
              const user = organizationMembers.find((wm) => wm.userId === m.userId)?.user;
              if (!user) return null;
              return (
                <div
                  key={m.userId}
                  className="flex items-center gap-2 rounded-lg border border-border p-2"
                >
                  <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                  <span className="text-sm flex-1 truncate">{user.name}</span>
                  <CustomSelect
                    options={PROJECT_ROLE_OPTIONS}
                    value={m.role}
                    onChange={(val) =>
                      setMembers((prev) =>
                        prev.map((row) =>
                          row.userId === m.userId
                            ? { ...row, role: val as ProjectRole }
                            : row
                        )
                      )
                    }
                    className="w-36"
                    triggerClassName="h-8 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMembers((prev) => prev.filter((row) => row.userId !== m.userId))
                    }
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {availableToAdd.length > 0 && (
              <div className="flex gap-2">
                <CustomSelect
                  options={availableToAdd.map((m) => ({
                    value: m.userId,
                    label: m.user.name,
                    avatarUrl: m.user.avatarUrl,
                  }))}
                  value={addUserId}
                  onChange={setAddUserId}
                  placeholder="Add member..."
                  className="flex-1"
                  triggerClassName="h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addMember}
                  disabled={!addUserId}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting || !name.trim()}>
            {submitting ? "Creating…" : "Create project"}
          </Button>
        </div>
      </div>
    </div>
  );
}
