"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, User, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { registerUser } from "@/lib/actions/auth";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const prefilledEmail = searchParams.get("email") ?? "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (inviteToken) {
      router.push(`/invite/${inviteToken}/join`);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">
            {inviteToken ? "Create your account to join" : "Create your account"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {inviteToken
              ? "You’ll be added to the project right after signup"
              : "Join TrackEzz and start shipping faster."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-6 shadow-lg space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                required
                minLength={2}
              />
            </div>
          </div>
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
                minLength={8}
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
                Creating account…
              </>
            ) : inviteToken ? (
              "Create account & join project"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        {inviteToken && <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={
              inviteToken
                ? `/login?email=${encodeURIComponent(prefilledEmail || email)}&callbackUrl=${encodeURIComponent(`/invite/${inviteToken}/join`)}`
                : "/login"
            }
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>}
      </div>
    </div>
  );
}
