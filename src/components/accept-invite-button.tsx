"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui";
import { signOutWithLoader } from "@/lib/auth/sign-out-client";
import {
  acceptInvitationAction,
  type AcceptInviteState,
} from "@/lib/actions/invitations";
import { toastError } from "@/lib/ui/toast";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Joining…" : "Accept invitation"}
    </Button>
  );
}

export function AcceptInviteButton({
  token,
  inviteEmail,
}: {
  token: string;
  inviteEmail: string;
}) {
  const [state, formAction] = useActionState<AcceptInviteState, FormData>(
    acceptInvitationAction.bind(null, token),
    null,
  );

  const emailMismatchError =
    state?.error?.toLowerCase().includes("invited email") ?? false;

  useEffect(() => {
    if (!state?.error) return;
    toastError(state.error);
  }, [state?.error]);

  const handleSwitchAccount = async () => {
    const callbackUrl = `/login?email=${encodeURIComponent(inviteEmail)}&callbackUrl=${encodeURIComponent(`/invite/${token}/join`)}`;
    await signOutWithLoader(callbackUrl);
  };

  return (
    <form action={formAction} className="space-y-2">
      {state?.error && (
        <div className="space-y-2">
          {emailMismatchError && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void handleSwitchAccount()}
              >
                Sign out and use {inviteEmail}
              </Button>
              <Link
                href={`/login?email=${encodeURIComponent(inviteEmail)}&callbackUrl=${encodeURIComponent(`/invite/${token}/join`)}`}
                className="block"
              >
                <Button variant="ghost" className="w-full">
                  Sign in with invited email
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
      <SubmitButton />
    </form>
  );
}
