"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, Sparkles } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  billingIntervalToggleBadgeClass,
  billingIntervalToggleButtonClass,
  billingIntervalToggleContainerClass,
} from "@/lib/billing/interval-toggle-styles";
import { useIsDarkTheme } from "@/hooks/use-is-dark-theme";
import {
  DEFAULT_PRO_PLAN_PRICING,
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
} from "@/lib/billing/plans";
import type { ProPlanPricing } from "@/lib/billing/plans";
import { getProPlanPricing } from "@/lib/actions/billing";

const DASHBOARD_BILLING_HREF = "/dashboard/settings?tab=billing";

const PLAN_COMPARISON = [
  { feature: "Projects", free: "Unlimited", pro: "Unlimited" },
  { feature: "Members", free: "Up to 10", pro: "Unlimited" },
  { feature: "AI messages / mo", free: "50", pro: "Unlimited" },
  { feature: "MCP / PAT", free: "Unlimited", pro: "Unlimited" },
  { feature: "Analytics", free: "Basic", pro: "Full" },
  { feature: "File storage", free: "100 MB", pro: "10 GB" },
] as const;

function useIsSignedIn() {
  const { status, data } = useSession();
  return {
    isSignedIn: status === "authenticated" && !!data?.user,
    isLoading: status === "loading",
  };
}

function CtaButtonSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-11 w-full rounded-md", className)} />;
}

type BillingInterval = "month" | "year";

type PricingSectionProps = {
  id?: string;
  showComparison?: boolean;
  className?: string;
};

export function PricingSection({
  id = "pricing",
  showComparison = true,
  className,
}: PricingSectionProps) {
  const { isSignedIn, isLoading } = useIsSignedIn();
  const beginRouteTransition = useAppStore((s) => s.beginRouteTransition);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [proPricing, setProPricing] = useState<ProPlanPricing>(
    DEFAULT_PRO_PLAN_PRICING,
  );
  const pathname = usePathname();
  const showComparisonTable = showComparison && pathname === "/pricing";
  const proCtaHref = isSignedIn ? DASHBOARD_BILLING_HREF : "/register";
  const selectedTrialDays =
    interval === "year"
      ? proPricing.annualTrialDays
      : proPricing.monthlyTrialDays;
  const proCtaLabel = isSignedIn
    ? `Start ${selectedTrialDays}-day free trial`
    : "Start free — upgrade in app";

  useEffect(() => {
    let cancelled = false;
    void getProPlanPricing()
      .then((pricing) => {
        if (!cancelled) setProPricing(pricing);
      })
      .catch((e) => {
        console.warn("[pricing] Could not load Paddle pricing.", e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 border-t border-border bg-muted/20 py-20 px-4",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
            Simple pricing, no surprises
          </h2>
          <p className="text-muted-foreground">
            Start free today. Upgrade to Pro when your team outgrows the limits.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 md:items-stretch">
          <PricingPlanCard>
            <PlanCardHeader label="Free" />
            <PlanPrice amount="$0" />
            <p className="mt-2 text-sm text-muted-foreground min-h-[2.5rem]">
              For individuals and small teams getting started
            </p>
            <PlanFeatureList features={FREE_PLAN_FEATURES} />
            <PlanCtaFooter note="">
              {isLoading ? (
                <CtaButtonSkeleton className="h-11" />
              ) : isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="block"
                  onClick={() =>
                    beginRouteTransition("/dashboard", { fullScreen: true })
                  }
                >
                  <Button size="lg" variant="secondary" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/register" className="block">
                  <Button size="lg" variant="secondary" className="w-full">
                    Create free account
                  </Button>
                </Link>
              )}
            </PlanCtaFooter>
          </PricingPlanCard>

          <PricingPlanCard highlighted>
            <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
              <Sparkles className="h-3 w-3" />
              {selectedTrialDays}-day free trial
            </span>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-h-[2.25rem] justify-between">
              <p className="text-lg font-semibold text-primary shrink-0">Pro</p>
              <BillingIntervalToggle
                interval={interval}
                onChange={setInterval}
                annualSavings={proPricing.annualSavingsPercent}
              />
            </div>

            <PlanPrice
              amount={
                interval === "month"
                  ? proPricing.monthly.formatted
                  : proPricing.annualMonthly.formatted
              }
              sub={
                interval === "year"
                  ? `${proPricing.annual.formatted} billed yearly`
                  : undefined
              }
            />
            <p className="mt-2 text-sm text-muted-foreground min-h-[2.5rem]">
              Unlimited members, AI, full analytics, and 10 GB storage
            </p>

            <PlanFeatureList features={PRO_PLAN_FEATURES} />

            <PlanCtaFooter
              note={
                interval === "year"
                  ? `${proPricing.annual.formatted}/year after trial · Cancel anytime`
                  : `${proPricing.monthly.formatted}/month after trial · Cancel anytime`
              }
            >
              {isLoading ? (
                <CtaButtonSkeleton className="h-11" />
              ) : (
                <Link
                  href={proCtaHref}
                  className="block"
                  onClick={() => {
                    if (isSignedIn) {
                      beginRouteTransition(proCtaHref, { fullScreen: true });
                    }
                  }}
                >
                  <Button size="lg" className="w-full">
                    <Sparkles className="h-4 w-4" />
                    {proCtaLabel}
                  </Button>
                </Link>
              )}
            </PlanCtaFooter>
          </PricingPlanCard>
        </div>

        {showComparisonTable ? (
          <div className="mt-12 overflow-x-auto rounded-2xl border border-border bg-card max-w-4xl mx-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-4 font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th className="px-5 py-4 font-semibold">Free</th>
                  <th className="px-5 py-4 font-semibold text-primary">Pro</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_COMPARISON.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-5 py-3 text-muted-foreground">
                      {row.feature}
                    </td>
                    <td className="px-5 py-3 font-medium">{row.free}</td>
                    <td className="px-5 py-3 font-medium text-primary">
                      {row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          See our{" "}
          <Link
            href="/refund-policy"
            className="text-primary underline underline-offset-2"
          >
            Refund Policy
          </Link>{" "}
          for paid plan cancellation details.
        </p>
      </div>
    </section>
  );
}

function PricingPlanCard({
  children,
  highlighted = false,
}: {
  children: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col h-full rounded-2xl p-8",
        highlighted
          ? "border-2 border-primary/50 bg-card shadow-xl shadow-primary/10"
          : "border border-border bg-card",
      )}
    >
      {children}
    </div>
  );
}

function PlanCardHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center min-h-[2.25rem]">
      <p className="text-lg font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function PlanPrice({ amount, sub }: { amount: string; sub?: string }) {
  return (
    <div className="mt-4 min-h-[5.25rem]">
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-extrabold tabular-nums">{amount}</span>
        <span className="text-muted-foreground">/ month</span>
      </div>
      <p
        className={cn(
          "mt-1 text-sm text-muted-foreground min-h-[1.25rem]",
          !sub && "invisible",
        )}
        aria-hidden={!sub}
      >
        {sub ?? "—"}
      </p>
    </div>
  );
}

function PlanFeatureList({ features }: { features: readonly string[] }) {
  return (
    <ul className="my-8 flex-1 space-y-3">
      {features.map((feature) => (
        <li key={feature} className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 shrink-0 text-primary" />
          {feature}
        </li>
      ))}
    </ul>
  );
}

function PlanCtaFooter({
  children,
  note,
}: {
  children: ReactNode;
  note: ReactNode;
}) {
  return (
    <div className="mt-auto space-y-3">
      {children}
      <p className="text-center text-xs text-muted-foreground min-h-[2rem] leading-4">
        {note}
      </p>
    </div>
  );
}

function BillingIntervalToggle({
  interval,
  onChange,
  annualSavings,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  annualSavings: number;
}) {
  const isDark = useIsDarkTheme();

  return (
    <div
      className={billingIntervalToggleContainerClass(isDark)}
      role="group"
      aria-label="Billing cycle"
    >
      <IntervalToggle
        active={interval === "month"}
        onClick={() => onChange("month")}
        label="Monthly"
        isDark={isDark}
      />
      <IntervalToggle
        active={interval === "year"}
        onClick={() => onChange("year")}
        label="Yearly"
        badge={`Save ${annualSavings}%`}
        isDark={isDark}
      />
    </div>
  );
}

function IntervalToggle({
  active,
  onClick,
  label,
  badge,
  isDark,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:px-3.5 sm:text-sm",
        billingIntervalToggleButtonClass(active, isDark),
      )}
    >
      {label}
      {badge && (
        <span
          className={cn(
            "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            billingIntervalToggleBadgeClass(active, isDark),
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
