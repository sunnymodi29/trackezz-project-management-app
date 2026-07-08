"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOutWithLoader } from "@/lib/auth/sign-out-client";
import { User, Lock, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Avatar,
} from "@/components/ui";
import { useDataStore } from "@/store/data-store";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  updateUserProfile,
  changePassword,
  uploadUserAvatar,
  removeUserAvatar,
  deleteUserAccount,
} from "@/lib/actions/user";
import { toastError, toastSuccess } from "@/lib/ui/toast";

export function UserProfileSettings() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { currentUser, patchCurrentUser, permissions } = useDataStore();

  const [name, setName] = useState(currentUser.name);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const emailMatches =
    deleteConfirmEmail.trim().toLowerCase() ===
    currentUser.email.toLowerCase();

  useEffect(() => {
    setAvatarUrl(currentUser.avatarUrl);
  }, [currentUser.avatarUrl]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateUserProfile({ name });
      patchCurrentUser({ name: updated.name });
      await updateSession({ name: updated.name });
      toastSuccess("Profile saved.");
      router.refresh();
    } catch (e) {
      toastError(e, "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toastError("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toastSuccess("Password updated.");
    } catch (e) {
      toastError(e, "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const applyAvatarUpdate = async (updated: { avatarUrl?: string; name: string }) => {
    const url = updated.avatarUrl;
    setAvatarUrl(url);
    patchCurrentUser({ avatarUrl: url });
    await updateSession({ image: url ?? null });
  };

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const formData = new FormData();
      formData.set("avatar", file);
      const updated = await uploadUserAvatar(formData);
      await applyAvatarUpdate(updated);
      toastSuccess("Profile saved.");
    } catch (e) {
      toastError(e, "Failed to upload avatar");
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true);
    try {
      const updated = await removeUserAvatar();
      await applyAvatarUpdate(updated);
      toastSuccess("Profile saved.");
    } catch (e) {
      toastError(e, "Failed to remove avatar");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteUserAccount({
        confirmEmail: deleteConfirmEmail,
        password: deletePassword || undefined,
      });
      setDeleteDialogOpen(false);
      await signOutWithLoader("/login");
    } catch (e) {
      toastError(e, "Failed to delete account");
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar
              src={avatarUrl}
              name={name || currentUser.email}
              size="lg"
            />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  disabled={avatarBusy}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void handleAvatarFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="default"
                  className="text-sm"
                  disabled={avatarBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarBusy ? "Uploading…" : "Change avatar"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-sm"
                  disabled={avatarBusy || !avatarUrl}
                  onClick={() => void handleRemoveAvatar()}
                >
                  Remove
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                JPEG, PNG, GIF, or WebP · max 2MB
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={currentUser.email} disabled />
            </div>
          </div>

          <Button
            onClick={() => void handleSaveProfile()}
            disabled={
              savingProfile || !name.trim() || name.trim() === currentUser.name
            }
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" /> Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            For accounts that sign in with email and password. Google sign-in
            users can skip this section.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Current password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Confirm new password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => void handleChangePassword()}
            disabled={
              savingPassword ||
              !currentPassword ||
              !newPassword ||
              newPassword.length < 8
            }
          >
            {savingPassword ? "Updating…" : "Change password"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and sign out. This cannot be undone.
            {permissions.isOrgOwner && (
              <span className="block mt-2 text-amber-400/90">
                You own an organization — ownership will transfer to another
                member, or the organization will be removed if you are the only
                member.
              </span>
            )}
          </p>
          <div className="space-y-3 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type your email to confirm
              </label>
              <Input
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder={currentUser.email}
                disabled={deletingAccount}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Password (required for email/password accounts)
              </label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                disabled={deletingAccount}
                autoComplete="current-password"
              />
            </div>
          </div>
          <Button
            variant="destructive"
            className="gap-2"
            disabled={!emailMatches || deletingAccount}
            onClick={() => {
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete your account?"
        description="This permanently removes your profile, memberships, and personal data. You will be signed out immediately."
        confirmLabel="Yes, delete my account"
        variant="destructive"
        loading={deletingAccount}
        onClose={() => {
          if (!deletingAccount) setDeleteDialogOpen(false);
        }}
        onConfirm={() => void handleDeleteAccount()}
      />
    </div>
  );
}
