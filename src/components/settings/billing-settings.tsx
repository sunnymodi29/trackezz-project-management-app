"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  CreditCard,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { DashboardLink } from "@/components/dashboard-link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useDataStore } from "@/store/data-store";
import {
  confirmProCheckout,
  createProCheckoutSession,
  getProPlanPricing,
  refreshBillingFromPaddle,
} from "@/lib/actions/billing";
import {
  DEFAULT_PRO_PLAN_PRICING,
  PRO_PLAN_FEATURES,
} from "@/lib/billing/plans";
import type { ProPlanPricing } from "@/lib/billing/plans";
import { formatLimit, formatStorageBytes } from "@/lib/billing/format";
import { openPaddleOverlayCheckout } from "@/lib/paddle-overlay";
import {
  billingCycleOptionClass,
  billingCycleSaveBadgeClass,
  billingIntervalToggleContainerClass,
  subscriptionStatusBadgeClass,
} from "@/lib/billing/interval-toggle-styles";
import { useIsDarkTheme } from "@/hooks/use-is-dark-theme";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess, toastInfo } from "@/lib/ui/toast";

type BillingInterval = "month" | "year";

export function BillingSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { billing, organization, patchBilling } = useDataStore();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [loading, setLoading] = useState<"checkout" | "sync" | null>(null);
  const [proPricing, setProPricing] = useState<ProPlanPricing>(
    DEFAULT_PRO_PLAN_PRICING,
  );
  const checkoutSyncedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getProPlanPricing()
      .then((pricing) => {
        if (!cancelled) setProPricing(pricing);
      })
      .catch((e) => {
        console.warn("[billing] Could not load Paddle pricing.", e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const transactionId =
      searchParams.get("transaction_id") ??
      searchParams.get("_ptxn") ??
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem("paddle_checkout_txn")
        : null);

    const shouldSyncCheckout =
      Boolean(transactionId) &&
      !checkoutSyncedRef.current &&
      checkout === "success";

    const shouldOpenCheckout =
      Boolean(transactionId) &&
      !checkoutSyncedRef.current &&
      checkout === "open";

    const handleCheckoutResult = (updated: Awaited<ReturnType<typeof confirmProCheckout>>) => {
      if (!updated.checkoutPending) {
        window.sessionStorage.removeItem("paddle_checkout_txn");
      }
      patchBilling(updated);
      if (updated.checkoutPending) {
        toastInfo(
          updated.checkoutMessage ??
            "Payment is still processing. Refresh subscription status in a moment.",
        );
      } else {
        toastSuccess("Pro subscription is active.");
      }
    };

    if (shouldOpenCheckout) {
      checkoutSyncedRef.current = true;
      window.sessionStorage.setItem("paddle_checkout_txn", transactionId!);
      setLoading("checkout");

      void openPaddleOverlayCheckout(transactionId!, async (txnId) => {
        setLoading("sync");
        const updated = await confirmProCheckout(txnId);
        handleCheckoutResult(updated);
        router.replace("/dashboard/settings?tab=billing");
        router.refresh();
      })
        .catch((e) => {
          const message = e instanceof Error ? e.message : "Checkout failed";
          if (message === "Checkout canceled") {
            window.sessionStorage.removeItem("paddle_checkout_txn");
            router.replace("/dashboard/settings?tab=billing");
          } else {
            toastError(message);
          }
          checkoutSyncedRef.current = false;
        })
        .finally(() => {
          setLoading(null);
        });
      return;
    }

    if (shouldSyncCheckout) {
      checkoutSyncedRef.current = true;
      setLoading("sync");

      void confirmProCheckout(transactionId!)
        .then((updated) => {
          handleCheckoutResult(updated);
          router.replace("/dashboard/settings?tab=billing");
          router.refresh();
        })
        .catch((e) => {
          const message =
            e instanceof Error
              ? e.message
              : "Payment succeeded but sync failed. Try refreshing status below.";
          if (message.includes("not complete yet")) {
            checkoutSyncedRef.current = false;
            toastInfo(message);
            return;
          }
          toastError(message);
          checkoutSyncedRef.current = false;
        })
        .finally(() => {
          setLoading(null);
        });
      return;
    }

    if (checkout === "success" && !transactionId) {
      toastInfo(
        "Payment received. Click “Refresh subscription status” below if your plan has not updated.",
      );
      router.replace("/dashboard/settings?tab=billing");
      return;
    }

    if (checkout === "cancel") {
      window.sessionStorage.removeItem("paddle_checkout_txn");
      toastInfo("Checkout canceled — no changes were made.");
      router.replace("/dashboard/settings?tab=billing");
    }
  }, [searchParams, router, patchBilling]);

  if (!billing || !organization) return null;

  const { isPro, status, usage, limits } = billing;
  const planLabel = isPro ? "Pro" : "Free";
  const statusLabel = formatSubscriptionStatus(isPro, status);
  const isDark = useIsDarkTheme();
  const selectedTrialDays =
    interval === "year"
      ? proPricing.annualTrialDays
      : proPricing.monthlyTrialDays;

  const startCheckout = async () => {
    setLoading("checkout");
    try {
      const session = await createProCheckoutSession(interval);

      window.sessionStorage.setItem("paddle_checkout_txn", session.transactionId);

      try {
        await openPaddleOverlayCheckout(session.transactionId, async (txnId) => {
          setLoading("sync");
          const updated = await confirmProCheckout(txnId);
          if (!updated.checkoutPending) {
            window.sessionStorage.removeItem("paddle_checkout_txn");
          }
          patchBilling(updated);
          if (updated.checkoutPending) {
            toastInfo(
              updated.checkoutMessage ??
                "Payment is still processing. Refresh subscription status in a moment.",
            );
          } else {
            toastSuccess("Pro subscription is active.");
          }
          router.refresh();
        });
        return;
      } catch (overlayError) {
        const message =
          overlayError instanceof Error ? overlayError.message : "Checkout failed";
        if (message === "Checkout canceled") {
          window.sessionStorage.removeItem("paddle_checkout_txn");
          throw overlayError;
        }
        if (session.url) {
          window.location.assign(session.url);
          return;
        }
        throw overlayError;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Checkout failed";
      if (message !== "Checkout canceled") {
        toastError(message);
      }
    } finally {
      setLoading(null);
    }
  };

  const refreshStatus = async () => {
    setLoading("sync");
    try {
      const updated = await refreshBillingFromPaddle();
      patchBilling(updated);
      if (updated.isPro) {
        toastSuccess("Subscription synced from Paddle.");
      } else {
        toastInfo("No active Pro subscription found in Paddle.");
      }
      router.refresh();
    } catch (e) {
      toastError(e, "Could not refresh subscription status");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {loading === "sync" && (
        <BillingAlert
          variant="loading"
          message="Activating your Pro subscription…"
        />
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Plan & billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  isPro
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {isPro ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current plan
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-2xl font-semibold tracking-tight">
                    {planLabel}
                  </p>
                  {statusLabel && (
                    <StatusBadge status={status} label={statusLabel} />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {organization.name}
                </p>
                {billing.currentPeriodEnd && isPro && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {status === "trialing" ? "Trial ends" : "Renews"}{" "}
                    {new Date(billing.currentPeriodEnd).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </p>
                )}
              </div>
            </div>

            {isPro && (
              <DashboardLink
                href="/dashboard/settings/subscription"
                className="inline-flex h-9 min-h-8 w-full sm:w-auto shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-transparent px-4 text-sm font-medium transition-all duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:min-h-0"
              >
                Manage subscription
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              </DashboardLink>
            )}
          </div>

          {!isPro && (
            <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
              <div className="p-5 sm:p-6 space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Upgrade to Pro</h3>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-lg">
                    Unlock unlimited members and AI, full analytics, and 10 GB
                    storage. Start with a {selectedTrialDays}-day free trial.
                  </p>
                </div>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {PRO_PLAN_FEATURES.slice(1).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pt-1 border-t border-border/60">
                  <div className="space-y-3 pt-4 lg:pt-5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Billing cycle
                    </p>
                    <div
                      className={billingIntervalToggleContainerClass(isDark)}
                      role="group"
                      aria-label="Billing cycle"
                    >
                      <BillingCycleOption
                        active={interval === "month"}
                        onClick={() => setInterval("month")}
                        title="Monthly"
                        price={proPricing.monthly.formatted}
                        period="/mo"
                        isDark={isDark}
                      />
                      <BillingCycleOption
                        active={interval === "year"}
                        onClick={() => setInterval("year")}
                        title="Yearly"
                        price={proPricing.annualMonthly.formatted}
                        period="/mo"
                        badge={`Save ${proPricing.annualSavingsPercent}%`}
                        sub={`${proPricing.annual.formatted} billed yearly`}
                        isDark={isDark}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:items-end lg:min-w-[220px]">
                    <Button
                      type="button"
                      size="lg"
                      onClick={startCheckout}
                      disabled={loading !== null}
                      className="w-full lg:w-auto"
                    >
                      {loading === "checkout" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Opening checkout…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Start {selectedTrialDays}-day free trial
                        </>
                      )}
                    </Button>
                    <p className="text-center lg:text-right text-xs text-muted-foreground">
                      {interval === "year"
                        ? `${proPricing.annual.formatted}/year after trial · Cancel anytime`
                        : `${proPricing.monthly.formatted}/month after trial · Cancel anytime`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">Usage</h3>
              {!isPro && (
                <button
                  type="button"
                  onClick={refreshStatus}
                  disabled={loading !== null}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn(
                      "h-3.5 w-3.5",
                      loading === "sync" && "animate-spin",
                    )}
                  />
                  {loading === "sync" ? "Refreshing…" : "Refresh status"}
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <UsageMeter
                label="Members"
                used={usage.members}
                limit={limits.maxMembers}
                formatValue={(n) => String(n)}
              />
              <UsageMeter
                label="AI messages"
                used={usage.aiMessagesThisMonth}
                limit={limits.maxAiMessagesPerMonth}
                formatValue={(n) => String(n)}
                hint="This month"
              />
              <UsageMeter
                label="File storage"
                used={usage.storageBytes}
                limit={limits.maxStorageBytes}
                formatValue={formatStorageBytes}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatSubscriptionStatus(
  isPro: boolean,
  status: string,
): string | null {
  if (!isPro) return null;

  const labels: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past due",
    canceled: "Canceled",
  };
  return labels[status] ?? status;
}

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const isDark = useIsDarkTheme();

  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        subscriptionStatusBadgeClass(status, isDark),
      )}
    >
      {label}
    </Badge>
  );
}

function BillingAlert({
  variant,
  message,
  onDismiss,
}: {
  variant: "success" | "error" | "loading";
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    success: "border-primary/20 bg-primary/5 text-foreground",
    error: "border-destructive/20 bg-destructive/10 text-destructive",
    loading: "border-border bg-muted/40 text-muted-foreground",
  };

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
        styles[variant],
      )}
      role="status"
    >
      <div className="flex items-center gap-2 min-w-0">
        {variant === "loading" && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        )}
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs opacity-70 hover:opacity-100"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

function BillingCycleOption({
  active,
  onClick,
  title,
  price,
  period,
  badge,
  sub,
  isDark,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  price: string;
  period: string;
  badge?: string;
  sub?: string;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative min-w-[7.5rem] rounded-lg px-4 py-2.5 text-left transition-all",
        billingCycleOptionClass(active, isDark),
      )}
    >
      {badge && (
        <span className={billingCycleSaveBadgeClass(isDark)}>{badge}</span>
      )}
      <span className="block text-xs font-medium">{title}</span>
      <span className="mt-0.5 flex items-baseline gap-0.5">
        <span className="text-lg font-semibold tabular-nums">{price}</span>
        <span className="text-xs text-muted-foreground">{period}</span>
      </span>
      {sub && (
        <span className="mt-0.5 block text-[10px] text-muted-foreground">
          {sub}
        </span>
      )}
    </button>
  );
}

function UsageMeter({
  label,
  used,
  limit,
  formatValue,
  hint,
}: {
  label: string;
  used: number;
  limit: number | null;
  formatValue: (n: number) => string;
  hint?: string;
}) {
  const unlimited = limit == null;
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  const atLimit = !unlimited && used >= limit;

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && (
            <p className="text-[11px] text-muted-foreground">{hint}</p>
          )}
        </div>
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            atLimit && "text-amber-500",
          )}
        >
          {formatValue(used)}
        </span>
      </div>
      {!unlimited ? (
        <>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                atLimit ? "bg-amber-500" : "bg-primary",
              )}
              style={{ width: `${Math.max(pct, used > 0 ? 4 : 0)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatLimit(limit, label.toLowerCase().includes("storage") ? "storage" : "members")}{" "}
            limit
          </p>
        </>
      ) : (
        <p className="text-xs text-primary/80 font-medium">Unlimited on Pro</p>
      )}
    </div>
  );
}
