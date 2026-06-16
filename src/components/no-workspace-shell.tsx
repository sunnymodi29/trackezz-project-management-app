"use client";

import { signOutWithLoader } from "@/lib/auth/sign-out-client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { UserProfileSettings } from "@/components/settings/user-profile-settings";

export function NoWorkspaceShell() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 h-14 flex items-center justify-between">
        <span className="font-bold text-sm tracking-tight">
          Track<span className="text-primary">Ezz</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => void signOutWithLoader("/login")}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            You are signed in, but you do not have access to any organization or
            projects. Update your profile below or sign in with another account
            if you were invited elsewhere.
          </p>
        </div>
        <UserProfileSettings />
      </main>
    </div>
  );
}
