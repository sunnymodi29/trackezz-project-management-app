"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, Sparkles } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
} from "@/lib/billing/plans";

const DASHBOARD_HREF = "/dashboard";

const PRO_TEASER_FEATURES = PRO_PLAN_FEATURES.filter(
  (feature) => !feature.toLowerCase().includes("trial"),
);

const FREE_PLAN_HIGHLIGHTS = [
  { feature: "Projects", value: "Unlimited" },
  { feature: "Members", value: "Up to 10" },
  { feature: "AI assistant messages / mo", value: "50" },
  { feature: "MCP / PAT", value: "Unlimited" },
  { feature: "Analytics", value: "Basic" },
  { feature: "File storage", value: "100 MB" },
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
            Start free today. Pro for larger teams is on the way.
          </p>
        </div>

        {showComparison ? (
          <div className="mb-12 overflow-x-auto rounded-2xl border border-border bg-card max-w-4xl mx-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-4 font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th className="px-5 py-4 font-semibold text-primary">Free</th>
                </tr>
              </thead>
              <tbody>
                {FREE_PLAN_HIGHLIGHTS.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-5 py-3 text-muted-foreground">
                      {row.feature}
                    </td>
                    <td className="px-5 py-3 font-medium">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 md:items-stretch">
          <div className="relative rounded-2xl border-2 border-primary/50 bg-card p-8 shadow-xl shadow-primary/10">
            <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
              Available now
            </span>
            <p className="text-sm font-semibold text-primary">Free</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold">$0</span>
              <span className="text-muted-foreground">/ month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              For individuals and small teams getting started
            </p>
            <ul className="my-8 space-y-3">
              {FREE_PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            {isLoading ? (
              <CtaButtonSkeleton className="h-11" />
            ) : isSignedIn ? (
              <Link
                href={DASHBOARD_HREF}
                className="block"
                onClick={() =>
                  beginRouteTransition(DASHBOARD_HREF, { fullScreen: true })
                }
              >
                <Button size="lg" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/register" className="block">
                <Button size="lg" className="w-full">
                  Create free account
                </Button>
              </Link>
            )}
          </div>

          <div className="relative flex flex-col rounded-2xl border border-dashed border-border bg-muted/30 p-8">
            <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-0.5 text-xs font-semibold text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Coming soon
            </span>
            <p className="text-sm font-medium text-muted-foreground">Pro</p>
            <div className="mt-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                Pricing announced soon
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Built for teams that need unlimited members, AI, and advanced
              analytics.
            </p>
            <ul className="my-8 flex-1 space-y-3">
              {PRO_TEASER_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button size="lg" variant="outline" className="w-full" disabled>
              Coming soon
            </Button>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          See our{" "}
          <Link
            href="/refund-policy"
            className="text-primary underline underline-offset-2"
          >
            Refund Policy
          </Link>{" "}
          for future paid plan cancellation details.
        </p>
      </div>
    </section>
  );
}
