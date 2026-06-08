"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import {
  AuthMethodDivider,
  GoogleSignInButton,
} from "@/components/auth/google-sign-in-button";
import { parseInviteTokenFromCallback } from "@/lib/auth/google";

export function LoginForm({ googleAuthEnabled }: { googleAuthEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const prefilledEmail = searchParams.get("email") ?? "";
  const inviteToken = useMemo(
    () => parseInviteTokenFromCallback(callbackUrl),
    [callbackUrl],
  );
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registerHref = inviteToken
    ? `/register?email=${encodeURIComponent(prefilledEmail)}&invite=${encodeURIComponent(inviteToken)}`
    : "/register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 rounded-xl bg-primary items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {inviteToken
              ? "Sign in with the invited email to join the project."
              : "Sign in to your TrackEzz workspace."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg space-y-4">
          {googleAuthEnabled && (
            <>
              <GoogleSignInButton callbackUrl={callbackUrl} />
              <AuthMethodDivider />
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="john.doe@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="email"
                  readOnly={!!inviteToken && !!prefilledEmail}
                  disabled={!!inviteToken && !!prefilledEmail}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in…
                </>
              ) : (
                "Sign in with email"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href={registerHref} className="text-primary hover:underline font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
