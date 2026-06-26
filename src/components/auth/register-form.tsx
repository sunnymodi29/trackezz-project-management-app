"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { registerUser } from "@/lib/actions/auth";
import { navigateAfterAuth } from "@/lib/auth/auth-navigation-client";
import {
  AuthDivider,
  AuthShell,
  AuthTrustLine,
} from "@/components/auth/auth-shell";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import {
  PasswordMatchHint,
  PasswordRequirements,
} from "@/components/auth/password-requirements";
import {
  getPasswordValidationError,
  isPasswordValid,
  passwordsMatch,
} from "@/lib/auth/password-policy";

export function RegisterForm({
  googleAuthEnabled = false,
}: {
  googleAuthEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const prefilledEmail = searchParams.get("email") ?? "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordValid = isPasswordValid(password);
  const confirmValid = passwordsMatch(password, confirmPassword);
  const canSubmit = passwordValid && confirmValid && !loading;

  const loginHref = inviteToken
    ? `/login?email=${encodeURIComponent(prefilledEmail || email)}&callbackUrl=${encodeURIComponent(`/invite/${inviteToken}/join`)}`
    : "/login";

  const postRegisterTarget = inviteToken
    ? `/invite/${inviteToken}/join`
    : "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (!passwordsMatch(password, confirmPassword)) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await registerUser({
      name,
      email,
      password,
      inviteToken: inviteToken ?? undefined,
    });
    if ("error" in result && result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (signInResult?.error) {
      setError("Account created. Please sign in.");
      router.push("/login");
      return;
    }

    navigateAfterAuth(router, postRegisterTarget);
  };

  return (
    <AuthShell
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={loginHref} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center lg:text-left">
          <h1 className="text-2xl font-bold tracking-tight">
            {inviteToken ? "Join your team" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {inviteToken
              ? "Create an account to accept the project invite and get started."
              : "Start free — plan sprints, track issues, and use AI in one place."}
          </p>
        </div>

        {googleAuthEnabled && !inviteToken ? (
          <div className="space-y-4">
            <GoogleOAuthButton
              callbackUrl="/dashboard"
              label="Sign up with Google"
            />
            <AuthDivider label="or sign up with email" />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="register-name"
            label="Full name"
            icon={User}
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
          />
          <AuthField
            id="register-email"
            label="Email"
            icon={Mail}
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={!!inviteToken && !!prefilledEmail}
            disabled={!!inviteToken && !!prefilledEmail}
            autoComplete="email"
          />
          <AuthField
            id="register-password"
            label="Password"
            icon={Lock}
            placeholder="Create a strong password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={128}
            autoComplete="new-password"
          />
          <PasswordRequirements password={password} />
          <div className="space-y-1.5">
            <AuthField
              id="register-confirm-password"
              label="Confirm password"
              icon={Lock}
              placeholder="Re-enter your password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              maxLength={128}
              autoComplete="new-password"
            />
            <PasswordMatchHint
              password={password}
              confirmPassword={confirmPassword}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : inviteToken ? (
              "Create account & join project"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          By creating an account, you agree to use TrackEzz in accordance with
          your organization&apos;s policies.
        </p>

        <AuthTrustLine />
      </div>
    </AuthShell>
  );
}
