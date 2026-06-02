import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { resolveSessionEmail } from "@/lib/auth/session-email";
import { getInvitationByToken } from "@/lib/actions/invitations";
import { Button } from "@/components/ui";
import { AcceptInviteButton } from "@/components/accept-invite-button";
import { InviteSwitchAccountButton } from "@/components/invite-switch-account-button";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold">Invitation not found</h1>
          <p className="text-muted-foreground text-sm">
            This link may be invalid or already used.
          </p>
          <Link href="/login" className="inline-flex">
            <Button>Go to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const inviteEmail = invitation.email.trim().toLowerCase();
  const sessionEmail = await resolveSessionEmail(session);

  if (invitation.inviteState === "accepted") {
    if (
      session?.user?.id &&
      sessionEmail &&
      sessionEmail === inviteEmail
    ) {
      redirect(`/invite/${token}/join`);
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 space-y-6 text-center">
          <h1 className="text-xl font-bold">You&apos;re already on the team</h1>
          <p className="text-sm text-muted-foreground">
            This invitation to <strong>{invitation.email}</strong> was already
            accepted. Sign in with that email to open the project.
          </p>
          <Link
            href={`/login?email=${encodeURIComponent(inviteEmail)}&callbackUrl=${encodeURIComponent("/dashboard")}`}
            className="block"
          >
            <Button className="w-full">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (invitation.inviteState === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold">Invitation expired</h1>
          <p className="text-muted-foreground text-sm">
            Ask {invitation.invitedBy.name} to send a new invite to {invitation.email}.
          </p>
          <Link href="/login" className="inline-flex">
            <Button>Go to login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const orgName =
    invitation.organization?.name ??
    invitation.project?.organization?.name ??
    "TrackEzz";
  const projectName = invitation.project?.name;
  const roleLabel =
    invitation.projectRole?.replace("_", " ") ??
    invitation.organizationRole?.replace("_", " ") ??
    "member";

  const emailMismatch =
    !!session?.user?.id &&
    !!sessionEmail &&
    sessionEmail !== inviteEmail;

  if (emailMismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 space-y-6 text-center">
          <h1 className="text-xl font-bold">Wrong account</h1>
          <p className="text-sm text-muted-foreground">
            You are signed in as <strong>{session.user?.email}</strong>, but this
            invitation was sent to <strong>{invitation.email}</strong>.
          </p>
          <p className="text-xs text-muted-foreground">
            Sign out and sign in with the invited email to accept.
          </p>
          <div className="flex flex-col gap-2">
            <InviteSwitchAccountButton
              inviteEmail={inviteEmail}
              token={token}
              className="w-full"
            />
            <Link
              href={`/login?email=${encodeURIComponent(inviteEmail)}&callbackUrl=${encodeURIComponent(`/invite/${token}/join`)}`}
              className="block"
            >
              <Button variant="ghost" className="w-full">
                Sign in with invited email
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    redirect(
      `/register?email=${encodeURIComponent(inviteEmail)}&invite=${encodeURIComponent(token)}`,
    );
  }

  if (sessionEmail === inviteEmail) {
    redirect(`/invite/${token}/join`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 space-y-6 text-center">
        <h1 className="text-xl font-bold">
          {projectName ? `Join ${projectName}` : `Join ${orgName}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Accept access{projectName ? ` to ${projectName}` : ""} ({orgName}) as {roleLabel}.
        </p>
        <AcceptInviteButton token={token} inviteEmail={inviteEmail} />
      </div>
    </div>
  );
}
