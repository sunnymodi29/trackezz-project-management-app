import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthEnabled } from "@/lib/auth/google";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const googleAuthEnabled = isGoogleAuthEnabled();
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm googleAuthEnabled={googleAuthEnabled} />
    </Suspense>
  );
}
