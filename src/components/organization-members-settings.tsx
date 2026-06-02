"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, UserPlus, Trash2, Clock, Send, Copy, Check } from "lucide-react";
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
import {
  sendOrganizationProjectAdminInvitation,
  cancelInvitation,
  resendInvitationEmail,
} from "@/lib/actions/invitations";
import { formatRelativeTime } from "@/lib/utils";

export function OrganizationMembersSettings() {
  const router = useRouter();
  const {
    organization,
    organizationMembers,
    invitations,
    permissions,
    currentUser,
  } = useDataStore();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const orgInvites = invitations.filter(
    (inv) => inv.organizationId && !inv.projectId
  );

  const handleInvite = async () => {
    if (!email.trim() || !organization) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await sendOrganizationProjectAdminInvitation({
        organizationId: organization.id,
        email: email.trim(),
      });
      setSuccess(`Invitation email sent to ${email.trim()}`);
      setLastInviteUrl(result.inviteUrl);
      setLinkCopied(false);
      setEmail("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const copyInviteLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setLastInviteUrl(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  };

  const handleResendInvite = async (id: string) => {
    setResendingId(id);
    setError(null);
    setSuccess(null);
    try {
      const { inviteUrl } = await resendInvitationEmail(id);
      setSuccess("Invitation email resent.");
      setLastInviteUrl(inviteUrl);
      setLinkCopied(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend email");
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await cancelInvitation(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel");
    }
  };

  if (!organization) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" /> Organization team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Project admins can create projects. Project-level members are managed on each
          project&apos;s Members page.
        </p>

        {permissions.canInviteOrgProjectAdmin && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                type="email"
                placeholder="project-admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button onClick={() => void handleInvite()} disabled={sending || !email.trim()}>
              {sending ? "Sending…" : "Invite project admin"}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">{error}</p>
        )}
        {success && (
          <div className="text-xs text-green-600 bg-green-500/10 rounded p-2 space-y-1 flex justify-between gap-4">
            <p className="m-0 truncate">{success}</p>
            {lastInviteUrl && (
              <button
                type="button"
                onClick={() => void copyInviteLink(lastInviteUrl)}
                className="inline-flex items-center gap-1 text-green-700 hover:underline font-medium shrink-0"
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
            )}
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            Members ({organizationMembers.length + (organization.ownerId === currentUser.id ? 0 : 0)})
          </h3>
          {organizationMembers.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <Avatar src={m.user.avatarUrl} name={m.user.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{m.user.email}</div>
              </div>
              <span className="text-xs capitalize text-muted-foreground">
                {m.role.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>

        {orgInvites.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Pending org invitations</h3>
            {orgInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2"
              >
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.organizationRole ?? "project admin"} · expires{" "}
                    {formatRelativeTime(inv.expiresAt)}
                  </div>
                </div>
                {permissions.canInviteOrgProjectAdmin && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      title="Resend email"
                      disabled={resendingId === inv.id}
                      onClick={() => void handleResendInvite(inv.id)}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Cancel invitation"
                      onClick={() => void handleCancelInvite(inv.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
