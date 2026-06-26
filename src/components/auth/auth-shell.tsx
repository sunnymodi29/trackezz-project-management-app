"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Check,
  Sparkles,
  SquareKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthLogo } from "@/components/auth/auth-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const BRAND_POINTS = [
  {
    icon: Bot,
    title: "AI project assistant",
    description: "Grounded answers from your real backlog, sprints, and workflow.",
  },
  {
    icon: SquareKanban,
    title: "Issues, board & sprints",
    description: "Plan, prioritize, and ship with one connected workspace.",
  },
  {
    icon: Sparkles,
    title: "Smart triage & MCP",
    description: "AI suggestions on create — connect Cursor and your IDE via PAT.",
  },
] as const;

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-border/60 bg-card lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 landing-grid opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/15 via-primary/10 to-background" />
        <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-16 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-12">
          <AuthLogo />

          <div className="max-w-md space-y-8">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered project management
              </p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
                Ship faster with{" "}
                <span className="gradient-text">clarity</span>, not chaos.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Track issues, run sprints, and let AI help triage, summarize, and
                connect your tools — all in one workspace.
              </p>
            </div>

            <ul className="space-y-4">
              {BRAND_POINTS.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-primary/20 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Free to start · No credit card required
          </p>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-col bg-background">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-6 lg:border-b-0">
          <div className="flex items-center gap-3 lg:hidden">
            <AuthLogo />
          </div>
          <Link
            href="/"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              "lg:absolute lg:left-6 lg:top-6",
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <div className={cn("lg:absolute lg:right-6 lg:top-6")}>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-[400px] animate-fade-in">{children}</div>
        </div>

        {footer ? (
          <div className="border-t border-border/60 px-4 py-4 text-center sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AuthDivider({ label = "or continue with email" }: { label?: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-[11px] uppercase tracking-wide">
        <span className="bg-background px-3 text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function AuthTrustLine() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <li className="inline-flex items-center gap-1">
        <Check className="h-3 w-3 text-primary" />
        Secure sign-in
      </li>
      <li className="inline-flex items-center gap-1">
        <Check className="h-3 w-3 text-primary" />
        Team invites
      </li>
      <li className="inline-flex items-center gap-1">
        <Check className="h-3 w-3 text-primary" />
        MCP-ready
      </li>
    </ul>
  );
}
