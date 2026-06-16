"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2 } from "lucide-react";
import { Button, Input, Textarea, CustomSelect, Avatar } from "@/components/ui";
import { useDataStore } from "@/store/data-store";
import { createProject } from "@/lib/actions/projects";
import { deriveProjectKey } from "@/lib/projects/project-utils";
import { PROJECT_ROLE_OPTIONS } from "@/lib/projects/constants";
import { getAssignableOrgUsers } from "@/lib/org/member-display";
import type { ProjectRole } from "@/types";

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
  const {
    organization,
    organizationMembers,
    projectMembers,
    projects,
    permissions,
    currentUser,
    upsertProject,
    upsertProjectMember,
  } = useDataStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [keyOverride, setKeyOverride] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<ProjectRole>("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const suggestedKey = useMemo(
    () => (keyOverride.trim() || deriveProjectKey(name)).toUpperCase(),
    [name, keyOverride]
  );

  const assignableOrgUsers = useMemo(
    () =>
      getAssignableOrgUsers(
        organization,
        organizationMembers,
        projectMembers,
        projects,
        currentUser,
      ),
    [
      organization,
      organizationMembers,
      projectMembers,
      projects,
      currentUser,
    ],
  );

  const autoAddedUserIds = useMemo(() => {
    const ids = new Set<string>([currentUser.id]);
    if (organization?.ownerId) ids.add(organization.ownerId);
    return ids;
  }, [currentUser.id, organization?.ownerId]);

  const availableToAdd = useMemo(
    () =>
      assignableOrgUsers.filter(
        (u) =>
          !autoAddedUserIds.has(u.userId) &&
          !members.some((d) => d.userId === u.userId),
      ),
    [assignableOrgUsers, autoAddedUserIds, members],
  );

  /** No other org users to pick besides creator / owner (both added as project admin on create). */
  const isSoleOrgUser = availableToAdd.length === 0;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setMembers([]);
    setAddUserId("");
    setAddRole("member");
    setTimeout(() => titleRef.current?.focus(), 50);
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
    setMembers((prev) => [...prev, { userId: addUserId, role: addRole }]);
    setAddUserId("");
    setAddRole("member");
  };

  const resolveUser = (userId: string) =>
    assignableOrgUsers.find((u) => u.userId === userId)?.user ??
    (userId === currentUser.id ? currentUser : null);

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
              {isSoleOrgUser
                ? "You (and the org owner, if different) are added as project admins automatically."
                : "You and the org owner are added as project admins. Add existing org users below and choose project admin or member."}
            </p>
            {members.map((m) => {
              const user = resolveUser(m.userId);
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
                      setMembers((prev) =>
                        prev.filter((row) => row.userId !== m.userId)
                      )
                    }
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {!isSoleOrgUser && (
              <div className="flex flex-col sm:flex-row gap-2">
                <CustomSelect
                  options={availableToAdd.map((m) => ({
                    value: m.userId,
                    label: m.user.name,
                    avatarUrl: m.user.avatarUrl,
                    showAvatar: true,
                  }))}
                  value={addUserId}
                  onChange={setAddUserId}
                  placeholder={
                    availableToAdd.length > 0
                      ? "Select org member…"
                      : "All org members added"
                  }
                  className="flex-1"
                  triggerClassName="h-9"
                />
                <CustomSelect
                  options={PROJECT_ROLE_OPTIONS}
                  value={addRole}
                  onChange={(val) => setAddRole(val as ProjectRole)}
                  className="w-36"
                  triggerClassName="h-9 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addMember}
                  disabled={!addUserId}
                  title="Add to project"
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
