import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create account" };

function googleAuthEnabled() {
  return !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterForm googleAuthEnabled={googleAuthEnabled()} />
    </Suspense>
  );
}
