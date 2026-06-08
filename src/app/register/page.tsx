import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleAuthEnabled } from "@/lib/auth/google";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  const googleAuthEnabled = isGoogleAuthEnabled();
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterForm googleAuthEnabled={googleAuthEnabled} />
    </Suspense>
  );
}
