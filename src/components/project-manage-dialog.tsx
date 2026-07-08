"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pushWithDashboardRouteTransition } from "@/lib/navigation/dashboard-navigation";
import { X, Users, Settings, Trash2, Mail, Clock, Send, Copy, Check } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  CustomSelect,
  Avatar,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDataStore } from "@/store/data-store";
import {
  updateProject,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  deleteProject,
} from "@/lib/actions/projects";
import {
  sendProjectInvitation,
  cancelInvitation,
  resendInvitationEmail,
} from "@/lib/actions/invitations";
import { PROJECT_ROLE_OPTIONS } from "@/lib/projects/constants";
import { projectIconFromName } from "@/lib/projects/project-utils";
import type { Project, ProjectRole } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/ui/toast";

interface ProjectManageDialogProps {
  project: Project | null;
  onClose: () => void;
}

export function ProjectManageDialog({ project, onClose }: ProjectManageDialogProps) {
  const router = useRouter();
  const {
    organizationMembers,
    invitations,
    permissions,
    currentUser,
    getProjectMembers,
    upsertProject,
    upsertProjectMember,
    removeProjectMember: removeMemberFromStore,
    patchProject,
  } = useDataStore();

  const [tab, setTab] = useState<"general" | "members">("general");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<ProjectRole>("member");
  const [saving, setSaving] = useState(false);
  const [memberBusy, setMemberBusy] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("member");
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const members = project ? getProjectMembers(project.id) : [];
  const myRole = members.find((m) => m.userId === currentUser.id)?.role;
  const canManage =
    permissions.isOrgOwner ||
    permissions.isOrgProjectAdmin ||
    myRole === "project_admin";
  const projectInvites = project
    ? invitations.filter((inv) => inv.projectId === project.id && inv.status === "pending")
    : [];

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setKey(project.key);
    setDescription(project.description ?? "");
    setTab("general");
  }, [project]);

  useEffect(() => {
    if (!project) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !removeTarget) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [project, saving, removeTarget, onClose]);

  const availableToAdd = useMemo(
    () =>
      organizationMembers.filter(
        (m) => !members.some((pm) => pm.userId === m.userId)
      ),
    [organizationMembers, members]
  );

  const saveGeneral = async () => {
    if (!project || !name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateProject(project.id, {
        name: name.trim(),
        key: key.trim(),
        description,
      });
      upsertProject({
        ...updated,
        icon: projectIconFromName(name),
      });
      toastSuccess("Project updated.");
      router.refresh();
    } catch (e) {
      toastError(e, "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!project || !addUserId) return;
    setMemberBusy(addUserId);
    try {
      const member = await addProjectMember(project.id, addUserId, addRole);
      upsertProjectMember(member);
      setAddUserId("");
      setAddRole("member");
      toastSuccess("Member added.");
      router.refresh();
    } catch (e) {
      toastError(e, "Failed to add member");
    } finally {
      setMemberBusy(null);
    }
  };

  const handleRoleChange = async (userId: string, role: ProjectRole) => {
    if (!project) return;
    setMemberBusy(userId);
    try {
      const member = await updateProjectMemberRole(project.id, userId, role);
      upsertProjectMember(member);
      toastSuccess("Member role updated.");
      router.refresh();
    } catch (e) {
      toastError(e, "Failed to update role");
    } finally {
      setMemberBusy(null);
    }
  };

  const copyInviteLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setLastInviteUrl(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toastError("Could not copy link");
    }
  };

  const handleInvite = async () => {
    if (!project || !inviteEmail.trim()) return;
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toastError("Enter a valid email address");
      return;
    }
    setInviting(true);
    try {
      const result = await sendProjectInvitation({
        projectId: project.id,
        email: normalizedEmail,
        role: inviteRole,
      });
      toastSuccess(`Invitation email sent to ${normalizedEmail}`);
      setLastInviteUrl(result.inviteUrl);
      setLinkCopied(false);
      setInviteEmail("");
      router.refresh();
    } catch (e) {
      toastError(e, "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      const { inviteUrl } = await resendInvitationEmail(invitationId);
      toastSuccess("Invitation email resent.");
      setLastInviteUrl(inviteUrl);
      setLinkCopied(false);
      router.refresh();
    } catch (e) {
      toastError(e, "Failed to resend email");
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      toastSuccess("Project deleted.");
      onClose();
      pushWithDashboardRouteTransition(router, "/dashboard/projects");
      router.refresh();
    } catch (e) {
      toastError(e, "Failed to delete project");
    } finally {
      setDeleting(false);
      setDeleteProjectOpen(false);
    }
  };

  const confirmRemoveMember = async () => {
    if (!project || !removeTarget) return;
    setMemberBusy(removeTarget.userId);
    try {
      await removeProjectMember(project.id, removeTarget.userId);
      removeMemberFromStore(project.id, removeTarget.userId);
      patchProject(project.id, {
        memberCount: Math.max(0, project.memberCount - 1),
      });
      setRemoveTarget(null);
      toastSuccess("Member removed.");
      router.refresh();
    } catch (e) {
      toastError(e, "Failed to remove member");
    } finally {
      setMemberBusy(null);
    }
  };

  if (!project) return null;

  return (
    <>
      <div className="fixed inset-0 z-10000 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={saving || removeTarget ? undefined : onClose}
        />
        <div className="relative flex h-dvh w-full max-w-xl flex-col overflow-hidden border border-border bg-card shadow-2xl animate-scale-in sm:h-auto sm:max-h-[90vh] sm:rounded-xl">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0"
              style={{
                backgroundColor: `${project.color}20`,
                color: project.color,
                border: `1px solid ${project.color}40`,
              }}
            >
              {projectIconFromName(name) || project.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold truncate">{project.name}</h2>
              <p className="text-xs text-muted-foreground font-mono">{project.key}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 transition-colors hover:bg-accent sm:p-1"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex gap-1 px-5 pt-3 border-b border-border">
            <TabButton active={tab === "general"} onClick={() => setTab("general")} icon={<Settings className="h-3.5 w-3.5" />}>
              General
            </TabButton>
            <TabButton active={tab === "members"} onClick={() => setTab("members")} icon={<Users className="h-3.5 w-3.5" />}>
              Members ({members.length})
            </TabButton>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4 sm:p-5">
            {tab === "general" && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project key</label>
                  <Input
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  Color is assigned at creation
                </div>
                {canManage && (
                  <div className="pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteProjectOpen(true)}
                    >
                      Delete project
                    </Button>
                  </div>
                )}
              </>
            )}

            {tab === "members" && (
              <>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col gap-2 rounded-lg border border-border p-2.5 sm:flex-row sm:items-center"
                    >
                      <Avatar src={m.user.avatarUrl} name={m.user.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{m.user.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {m.user.email}
                        </div>
                      </div>
                      <CustomSelect
                        options={PROJECT_ROLE_OPTIONS}
                        value={m.role}
                        onChange={(val) => void handleRoleChange(m.userId, val as ProjectRole)}
                        disabled={memberBusy === m.userId}
                        className="w-full sm:w-36"
                        triggerClassName="sm:h-8 sm:text-xs"
                        optionsClassName="z-10000!"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setRemoveTarget({ userId: m.userId, name: m.user.name })
                        }
                        disabled={memberBusy === m.userId}
                        className="self-end rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:self-auto sm:p-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No members yet.
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <label className="text-sm font-medium">Invite by email</label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <div className="relative flex-1 min-w-[160px]">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          className="pl-8 sm:h-9"
                          type="email"
                          placeholder="teammate@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <CustomSelect
                        options={PROJECT_ROLE_OPTIONS}
                        value={inviteRole}
                        onChange={(val) => setInviteRole(val as ProjectRole)}
                        className="w-full sm:w-36"
                        triggerClassName="sm:h-9 sm:text-xs"
                        optionsClassName="z-10000!"
                      />
                      <Button
                        type="button"
                        onClick={() => void handleInvite()}
                        disabled={inviting || !inviteEmail.trim()}
                      >
                        {inviting ? "Sending…" : "Invite"}
                      </Button>
                    </div>
                    {lastInviteUrl && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void copyInviteLink(lastInviteUrl)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline font-medium"
                        >
                          {linkCopied ? (
                            <>
                              <Check className="h-3 w-3" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy invite link
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {projectInvites.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pending invitations</label>
                    {projectInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-2"
                      >
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="truncate">{inv.email}</div>
                          <div className="text-muted-foreground">
                            {inv.projectRole} · {formatRelativeTime(inv.expiresAt)}
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              title="Resend email"
                              disabled={resendingId === inv.id}
                              onClick={() => void handleResendInvite(inv.id)}
                              className="p-1 rounded-md hover:bg-accent text-muted-foreground disabled:opacity-50"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Cancel invitation"
                              onClick={() => void cancelInvitation(inv.id).then(() => router.refresh())}
                              className="p-1 rounded-md hover:bg-destructive/10 text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canManage && availableToAdd.length > 0 && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <label className="text-sm font-medium">Add existing org member</label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <CustomSelect
                        options={availableToAdd.map((wm) => ({
                          value: wm.userId,
                          label: wm.user.name,
                          avatarUrl: wm.user.avatarUrl,
                          showAvatar: true,
                        }))}
                        value={addUserId}
                        onChange={setAddUserId}
                        placeholder="Select user..."
                        className="flex-1 min-w-0 sm:min-w-[160px]"
                        triggerClassName="sm:h-9"
                        optionsClassName="z-10000!"
                      />
                      <CustomSelect
                        options={PROJECT_ROLE_OPTIONS}
                        value={addRole}
                        onChange={(val) => setAddRole(val as ProjectRole)}
                        className="w-full sm:w-36"
                        triggerClassName="sm:h-9 sm:text-xs"
                        optionsClassName="z-10000!"
                      />
                      <Button
                        type="button"
                        onClick={() => void handleAddMember()}
                        disabled={!addUserId || !!memberBusy}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {tab === "general" && (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5 sm:pb-4">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Close
              </Button>
              <Button onClick={() => void saveGeneral()} disabled={saving || !name.trim()}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
          {tab === "members" && (
            <div className="flex justify-end border-t border-border px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-5 sm:pb-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteProjectOpen}
        title="Delete project?"
        description="All issues and data in this project will be permanently removed."
        confirmLabel="Delete project"
        variant="destructive"
        loading={deleting}
        onClose={() => !deleting && setDeleteProjectOpen(false)}
        onConfirm={() => void handleDeleteProject()}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove member?"
        description={
          removeTarget
            ? `${removeTarget.name} will lose access to this project.`
            : undefined
        }
        confirmLabel="Remove"
        variant="destructive"
        loading={!!memberBusy}
        onClose={() => !memberBusy && setRemoveTarget(null)}
        onConfirm={() => void confirmRemoveMember()}
      />
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-10 items-center gap-1.5 rounded-t-md px-3 py-2.5 text-xs font-medium transition-colors sm:min-h-0",
        active
          ? "z-10 bg-card text-primary shadow-[inset_0_-2px_0_0_var(--color-primary)]"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
