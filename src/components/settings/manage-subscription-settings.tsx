"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { DashboardLink } from "@/components/dashboard-link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDataStore } from "@/store/data-store";
import {
  cancelProSubscription,
  createBillingPortalSession,
  getProPlanPricing,
  getSubscriptionManagementDetails,
  keepProSubscription,
  refreshBillingFromPaddle,
  resumeProSubscription,
  switchProSubscriptionInterval,
  type BillingStatus,
  type SubscriptionManagementDetails,
} from "@/lib/actions/billing";
import {
  DEFAULT_PRO_PLAN_PRICING,
  PRO_PLAN_FEATURES,
  type ProPlanPricing,
} from "@/lib/billing/plans";
import {
  billingCycleOptionClass,
  billingCycleSaveBadgeClass,
  billingIntervalToggleContainerClass,
  subscriptionStatusBadgeClass,
} from "@/lib/billing/interval-toggle-styles";
import { useIsDarkTheme } from "@/hooks/use-is-dark-theme";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type BillingInterval = "month" | "year";
type LoadingAction =
  | "portal"
  | "sync"
  | "cancel"
  | "keep"
  | "resume"
  | "switch"
  | null;

export function ManageSubscriptionSettings({
  initialDetails,
  initialBilling,
}: {
  initialDetails: SubscriptionManagementDetails;
  initialBilling: BillingStatus;
}) {
  const router = useRouter();
  const { organization, patchBilling } = useDataStore();
  const [details, setDetails] =
    useState<SubscriptionManagementDetails>(initialDetails);
  const [proPricing, setProPricing] = useState<ProPlanPricing>(
    DEFAULT_PRO_PLAN_PRICING,
  );
  const [loading, setLoading] = useState<LoadingAction>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const isDark = useIsDarkTheme();

  useEffect(() => {
    let cancelled = false;
    void getProPlanPricing()
      .then((pricing) => {
        if (!cancelled) setProPricing(pricing);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshDetails = async () => {
    const next = await getSubscriptionManagementDetails();
    setDetails(next);
  };

  const patchBillingState = (updated: BillingStatus) => {
    patchBilling(updated);
  };

  const refreshStatus = async () => {
    setLoading("sync");
    try {
      const updated = await refreshBillingFromPaddle();
      patchBillingState(updated);
      router.refresh();
      await refreshDetails();
      toastSuccess("Subscription synced from Paddle.");
    } catch (e) {
      toastError(e, "Could not refresh subscription status");
    } finally {
      setLoading(null);
    }
  };

  const openPaymentPortal = async () => {
    setLoading("portal");
    try {
      const { url } = await createBillingPortalSession();
      window.open(url, "_blank");
    } catch (e) {
      toastError(e, "Could not open payment settings");
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setLoading("cancel");
    try {
      const updated = await cancelProSubscription();
      patchBillingState(updated);
      await refreshDetails();
      setConfirmCancelOpen(false);
      toastSuccess("Subscription will cancel at the end of the billing period.");
    } catch (e) {
      toastError(e, "Could not cancel subscription");
    } finally {
      setLoading(null);
    }
  };

  const handleKeepSubscription = async () => {
    setLoading("keep");
    try {
      const updated = await keepProSubscription();
      patchBillingState(updated);
      await refreshDetails();
      toastSuccess("Your Pro subscription will continue.");
    } catch (e) {
      toastError(e, "Could not keep subscription");
    } finally {
      setLoading(null);
    }
  };

  const handleResume = async () => {
    setLoading("resume");
    try {
      const updated = await resumeProSubscription();
      patchBillingState(updated);
      await refreshDetails();
      toastSuccess("Subscription resumed.");
    } catch (e) {
      toastError(e, "Could not resume subscription");
    } finally {
      setLoading(null);
    }
  };

  const handleSwitchInterval = async (interval: BillingInterval) => {
    if (interval === details.interval) return;
    setLoading("switch");
    try {
      const updated = await switchProSubscriptionInterval(interval);
      patchBillingState(updated);
      await refreshDetails();
      toastSuccess(
        interval === "year"
          ? details.status === "trialing"
            ? "Switched to yearly billing for the remainder of your trial."
            : "Yearly billing will take effect on your next renewal."
          : details.status === "trialing"
            ? "Switched to monthly billing for the remainder of your trial."
            : "Monthly billing will take effect on your next renewal.",
      );
    } catch (e) {
      toastError(e, "Could not change billing cycle");
    } finally {
      setLoading(null);
    }
  };

  if (!organization) return null;

  const statusLabel = formatSubscriptionStatus(details.status);
  const scheduledCancel = details.scheduledChange?.action === "cancel";
  const scheduledPause = details.scheduledChange?.action === "pause";
  const isPaused = details.status === "paused";
  const renewalDate = details.currentPeriodEnd
    ? formatDate(details.currentPeriodEnd)
    : null;
  const cancelEffectiveDate = details.scheduledChange?.effectiveAt
    ? formatDate(details.scheduledChange.effectiveAt)
    : renewalDate;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 overflow-x-hidden">
      <div className="space-y-4 animate-fade-in">
        <DashboardLink
          href="/dashboard/settings?tab=billing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to billing
        </DashboardLink>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manage subscription</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Update billing, payment method, or cancel Pro for {organization.name}.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshStatus()}
            disabled={loading !== null}
            className="w-full sm:w-auto shrink-0"
          >
            <RefreshCw
              className={cn("h-4 w-4", loading === "sync" && "animate-spin")}
            />
            Refresh status
          </Button>
        </div>
      </div>

      {scheduledCancel && cancelEffectiveDate && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-amber-600 dark:text-amber-400">
            Cancellation scheduled
          </p>
          <p className="mt-1 text-muted-foreground">
            Pro stays active until {cancelEffectiveDate}. You can keep your
            subscription before then.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={() => void handleKeepSubscription()}
            disabled={loading !== null}
          >
            {loading === "keep" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Keep Pro subscription"
            )}
          </Button>
        </div>
      )}

      {isPaused && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium">Subscription paused</p>
          <p className="mt-1 text-muted-foreground">
            Resume billing to restore full Pro access.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={() => void handleResume()}
            disabled={loading !== null}
          >
            {loading === "resume" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Resume subscription"
            )}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Pro plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-semibold tracking-tight">Pro</p>
                {statusLabel && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      subscriptionStatusBadgeClass(details.status, isDark),
                    )}
                  >
                    {statusLabel}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {details.priceFormatted}
                {details.interval === "year" ? " / year" : " / month"}
              </p>
              {renewalDate && (
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {details.status === "trialing" ? "Trial ends" : "Renews"}{" "}
                  {renewalDate}
                </p>
              )}
            </div>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {PRO_PLAN_FEATURES.slice(1).map((feature) => (
              <li
                key={feature}
                className="text-sm text-muted-foreground before:content-['•'] before:mr-2 before:text-primary"
              >
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {!scheduledCancel && !isPaused && !scheduledPause && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Billing cycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Switch between monthly and yearly billing.
              {details.status === "trialing"
                ? " Changes apply immediately during your trial."
                : " Changes take effect on your next renewal."}
            </p>
            <div
              className={billingIntervalToggleContainerClass(isDark)}
              role="group"
              aria-label="Billing cycle"
            >
              <BillingCycleOption
                active={details.interval === "month"}
                onClick={() => void handleSwitchInterval("month")}
                title="Monthly"
                price={proPricing.monthly.formatted}
                period="/mo"
                isDark={isDark}
                disabled={loading === "switch"}
              />
              <BillingCycleOption
                active={details.interval === "year"}
                onClick={() => void handleSwitchInterval("year")}
                title="Yearly"
                price={proPricing.annualMonthly.formatted}
                period="/mo"
                badge={`Save ${proPricing.annualSavingsPercent}%`}
                sub={`${proPricing.annual.formatted} billed yearly`}
                isDark={isDark}
                disabled={loading === "switch"}
              />
            </div>
            {loading === "switch" && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating billing cycle…
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Payment method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Update your card or billing details securely through Paddle.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void openPaymentPortal()}
            disabled={loading !== null}
          >
            {loading === "portal" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening payment portal…
              </>
            ) : (
              <>
                Update payment method
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {!scheduledCancel && !isPaused && initialBilling.isPro && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-0">
            <CardTitle className="text-base text-destructive">
              Cancel subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cancel at the end of your current billing period. You keep Pro
              access until {renewalDate ?? "the period ends"}.
            </p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmCancelOpen(true)}
              disabled={loading !== null}
            >
              Cancel Pro subscription
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Cancel Pro subscription?"
        description={
          renewalDate
            ? `Your organization will keep Pro until ${renewalDate}, then revert to the Free plan.`
            : "Your organization will revert to the Free plan at the end of the current billing period."
        }
        confirmLabel="Cancel subscription"
        variant="destructive"
        loading={loading === "cancel"}
        onConfirm={() => void handleCancel()}
        onClose={() => {
          if (loading !== "cancel") setConfirmCancelOpen(false);
        }}
      />
    </div>
  );
}

function formatSubscriptionStatus(status: string): string | null {
  const labels: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past due",
    canceled: "Canceled",
    paused: "Paused",
  };
  return labels[status] ?? status;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  price: string;
  period: string;
  badge?: string;
  sub?: string;
  isDark: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || active}
      className={cn(
        "relative min-w-[7.5rem] rounded-lg px-4 py-2.5 text-left transition-all disabled:opacity-60",
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
