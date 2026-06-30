import type { Metadata } from "next";
import Link from "next/link";
import { AuthLogo } from "@/components/auth/auth-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PricingSection } from "@/components/landing/pricing-section";
import { MARKETING_FOOTER_LINKS } from "@/components/landing/marketing-footer-links";
import {
  PRO_PRICE_ANNUAL_TOTAL_USD,
  PRO_PRICE_MONTHLY_USD,
  PRO_TRIAL_DAYS,
  formatUsd,
} from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: `TrackEzz pricing: Free for small teams. Pro from ${formatUsd(PRO_PRICE_MONTHLY_USD)}/month with a ${PRO_TRIAL_DAYS}-day trial.`,
};

const PRICING_FAQ = [
  {
    q: "Can I stay on Free forever?",
    a: "Yes. The Free plan has no time limit. Upgrade to Pro only when you need unlimited members, unlimited AI messages, full analytics, or more storage.",
  },
  {
    q: "How much does Pro cost?",
    a: `Pro is ${formatUsd(PRO_PRICE_MONTHLY_USD)}/month or ${formatUsd(PRO_PRICE_ANNUAL_TOTAL_USD)}/year, with a ${PRO_TRIAL_DAYS}-day free trial. You won't be charged until the trial ends.`,
  },
  {
    q: "Do you offer refunds?",
    a: "We handle refunds case by case for billing errors and as required by law. See our Refund Policy for full details.",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <AuthLogo />
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b border-border px-4 py-14 text-center md:py-20">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Pricing built for growing teams
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free with unlimited projects. Pro from{" "}
              {formatUsd(PRO_PRICE_MONTHLY_USD)}/month with a {PRO_TRIAL_DAYS}
              -day trial.
            </p>
          </div>
        </section>

        <PricingSection id="plans" className="border-t-0" />

        <section className="px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-6 text-center text-2xl font-bold">
              Pricing questions
            </h2>
            <div className="space-y-4">
              {PRICING_FAQ.map((item) => (
                <div
                  key={item.q}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <h3 className="font-semibold">{item.q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              More questions?{" "}
              <Link href="/contact-us" className="text-primary hover:underline">
                Contact us
              </Link>{" "}
              or read the{" "}
              <Link href="/refund-policy" className="text-primary hover:underline">
                Refund Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6">
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
