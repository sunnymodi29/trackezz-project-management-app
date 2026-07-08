"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { navigateAfterAuth } from "@/lib/auth/auth-navigation-client";
import {
  AuthDivider,
  AuthShell,
  AuthTrustLine,
} from "@/components/auth/auth-shell";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { toastError } from "@/lib/ui/toast";

export function LoginForm({ googleAuthEnabled = false }: { googleAuthEnabled?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const prefilledEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      toastError("Invalid email or password. Please try again.");
      return;
    }

    navigateAfterAuth(router, callbackUrl);
  };

  return (
    <AuthShell
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Create account
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center lg:text-left">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your TrackEzz workspace to continue.
          </p>
        </div>

        {googleAuthEnabled ? (
          <div className="space-y-4">
            <GoogleOAuthButton callbackUrl={callbackUrl} />
            <AuthDivider />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="login-email"
            label="Email"
            icon={Mail}
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <AuthField
            id="login-password"
            label="Password"
            icon={Lock}
            placeholder="Enter your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <AuthTrustLine />
      </div>
    </AuthShell>
  );
}
