"use client";

import { signOutWithLoader } from "@/lib/auth/sign-out-client";
import { Button } from "@/components/ui";

export function InviteSwitchAccountButton({
  inviteEmail,
  token,
  variant = "outline",
  className,
}: {
  inviteEmail: string;
  token: string;
  variant?: "outline" | "default" | "ghost";
  className?: string;
}) {
  const handleClick = async () => {
    const callbackUrl = `/login?email=${encodeURIComponent(inviteEmail)}&callbackUrl=${encodeURIComponent(`/invite/${token}/join`)}`;
    await signOutWithLoader(callbackUrl);
  };

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => void handleClick()}
    >
      Sign out and use {inviteEmail}
    </Button>
  );
}
