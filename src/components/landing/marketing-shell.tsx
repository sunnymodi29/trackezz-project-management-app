"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthLogo } from "@/components/auth/auth-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { MARKETING_FOOTER_LINKS } from "@/components/landing/marketing-footer-links";

export function MarketingShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4">
          <AuthLogo />
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back to home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <main className={cn("flex-1 px-4 py-10 md:py-14", className)}>
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>

      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
          <nav
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            aria-label="Legal and support"
          >
            {MARKETING_FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TrackEzz. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
