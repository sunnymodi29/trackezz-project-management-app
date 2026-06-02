"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui";
import { clearWorkspaceCookies } from "@/lib/actions/org";

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
    await clearWorkspaceCookies();
    await signOut({
      callbackUrl: `/login?email=${encodeURIComponent(inviteEmail)}&callbackUrl=${encodeURIComponent(`/invite/${token}/join`)}`,
    });
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
