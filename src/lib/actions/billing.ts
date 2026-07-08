"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isOrgOwner } from "@/lib/auth/rbac";
import {
  getOrgBillingSnapshot,
  getEffectivePlanId,
} from "@/lib/billing/entitlements";
import {
  DEFAULT_PRO_PLAN_PRICING,
  PLAN_LIMITS,
  PRO_TRIAL_DAYS,
  formatMinorUnitMoney,
  formatMoney,
  proAnnualSavingsPercent,
  type MoneyAmount,
  type ProPlanPricing,
} from "@/lib/billing/plans";
import type { BillingSnapshot } from "@/lib/queries/bootstrap";
import {
  getPaddle,
  isLocalhostAppOrigin,
  paddleCheckoutConfig,
  proPriceId,
  requestAppOrigin,
} from "@/lib/paddle";
import { resolveActiveOrganizationSlug } from "@/lib/org/resolve-active-org";
import {
  syncPaddleSubscriptionById,
  syncPaddleSubscriptionToOrg,
} from "@/lib/billing/sync-paddle-subscription";
import type { Subscription as PaddleSubscription } from "@paddle/paddle-node-sdk";
import { clearLegacyStripeBillingData } from "@/lib/billing/clear-legacy-stripe-billing";
import {
  isPaddleCustomerId,
  isPaddleSubscriptionId,
} from "@/lib/billing/legacy-billing-ids";
import {
  invalidateBootstrapForOrganization,
  invalidateBootstrapForUser,
} from "@/lib/org/cache";
import { resolveCustomerPortalUrl } from "@/lib/billing/resolve-portal-url";

const orgBillingInclude = {
  subscription: true,
  owner: { select: { email: true, name: true } },
} as const;

const PRO_PLAN_PRICING_CACHE_MS = 30 * 1000;

let proPlanPricingCache:
  | { value: ProPlanPricing; expiresAt: number }
  | undefined;

type PaddlePriceLike = {
  unitPrice?: {
    amount?: string | number;
    currencyCode?: string;
  };
  trialPeriod?: {
    interval?: "day" | "week" | "month" | "year";
    frequency?: number;
  } | null;
};

function toMoneyAmount(price: PaddlePriceLike): MoneyAmount | null {
  const amount = price.unitPrice?.amount;
  const currencyCode = price.unitPrice?.currencyCode;
  if (amount == null || !currencyCode) return null;
  return formatMinorUnitMoney(amount, currencyCode);
}

function trialPeriodToDays(price: PaddlePriceLike): number | null {
  const frequency = price.trialPeriod?.frequency;
  const interval = price.trialPeriod?.interval;
  if (!frequency || !interval) return null;

  switch (interval) {
    case "day":
      return frequency;
    case "week":
      return frequency * 7;
    case "month":
      return frequency * 30;
    case "year":
      return frequency * 365;
    default:
      return null;
  }
}

async function getPaddlePrice(priceId: string): Promise<PaddlePriceLike> {
  const paddle = getPaddle();
  const prices = paddle.prices as {
    get: (id: string) => Promise<PaddlePriceLike>;
  };
  return prices.get(priceId);
}

export async function getProPlanPricing(): Promise<ProPlanPricing> {
  const now = Date.now();
  if (proPlanPricingCache && proPlanPricingCache.expiresAt > now) {
    return proPlanPricingCache.value;
  }

  try {
    const [monthlyPrice, annualPrice] = await Promise.all([
      getPaddlePrice(proPriceId("month")),
      getPaddlePrice(proPriceId("year")),
    ]);

    const monthly = toMoneyAmount(monthlyPrice);
    const annual = toMoneyAmount(annualPrice);
    if (!monthly || !annual) return DEFAULT_PRO_PLAN_PRICING;

    const annualMonthlyAmount = Math.round((annual.amount / 12) * 100) / 100;
    const pricing = {
      monthly,
      annual,
      annualMonthly: {
        amount: annualMonthlyAmount,
        currencyCode: annual.currencyCode,
        formatted: formatMoney(annualMonthlyAmount, annual.currencyCode),
      },
      annualSavingsPercent: proAnnualSavingsPercent({ monthly, annual }),
      monthlyTrialDays: trialPeriodToDays(monthlyPrice) ?? PRO_TRIAL_DAYS,
      annualTrialDays: trialPeriodToDays(annualPrice) ?? PRO_TRIAL_DAYS,
    };

    proPlanPricingCache = {
      value: pricing,
      expiresAt: now + PRO_PLAN_PRICING_CACHE_MS,
    };
    return pricing;
  } catch (error) {
    console.warn("[billing] Paddle pricing lookup failed; using fallback.", error);
    return DEFAULT_PRO_PLAN_PRICING;
  }
}

async function getActiveOrganizationForBilling(userId: string) {
  const slug = await resolveActiveOrganizationSlug(userId);
  if (!slug) return null;

  return prisma.organization.findUnique({
    where: { slug },
    include: orgBillingInclude,
  });
}

export type BillingStatus = BillingSnapshot & {
  canManageBilling: boolean;
};

export type ConfirmProCheckoutResult = BillingStatus & {
  checkoutPending?: boolean;
  checkoutMessage?: string;
};

async function pendingCheckoutSnapshot(
  organizationId: string,
  message: string,
): Promise<ConfirmProCheckoutResult> {
  const snapshot = await getOrgBillingSnapshot(organizationId);
  return {
    ...toBillingSnapshot(snapshot, true),
    checkoutPending: true,
    checkoutMessage: message,
  };
}

function toBillingSnapshot(
  snapshot: Awaited<ReturnType<typeof getOrgBillingSnapshot>>,
  canManageBilling: boolean,
): BillingStatus {
  const planId = getEffectivePlanId(snapshot);
  return {
    plan: planId,
    status: snapshot.status,
    isPro: snapshot.isPro,
    currentPeriodEnd: snapshot.currentPeriodEnd?.toISOString() ?? null,
    usage: snapshot.usage,
    limits: PLAN_LIMITS[planId],
    canManageBilling,
  };
}

async function requireOrgOwnerBillingContext() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const org = await getActiveOrganizationForBilling(session.user.id);
  if (!org) throw new Error("No active organization");

  const owner = isOrgOwner(session.user.id, org);
  if (!owner) {
    throw new Error("FORBIDDEN: Only the organization owner can manage billing");
  }

  return { session, org };
}

async function findPaddleCustomerByEmail(email: string) {
  const paddle = getPaddle();

  try {
    const customers = paddle.customers.list({ email: [email] });
    for await (const customer of customers) {
      return customer.id;
    }
  } catch (error) {
    console.warn(
      "[billing] Paddle customer lookup failed; creating a new customer instead.",
      error,
    );
  }

  return null;
}

async function persistPaddleCustomerId(
  organizationId: string,
  customerId: string,
) {
  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      paddleCustomerId: customerId,
      plan: "free",
      status: "active",
    },
    update: { paddleCustomerId: customerId },
  });
}

async function ensurePaddleCustomer(
  org: NonNullable<Awaited<ReturnType<typeof getActiveOrganizationForBilling>>>,
) {
  await clearLegacyStripeBillingData(org.id);

  const paddle = getPaddle();
  let customerId = org.subscription?.paddleCustomerId ?? undefined;

  if (isPaddleCustomerId(customerId)) {
    try {
      await paddle.customers.get(customerId);
      return customerId;
    } catch {
      customerId = undefined;
    }
  } else if (customerId) {
    // Legacy Stripe customer IDs were migrated into this column.
    customerId = undefined;
  }

  customerId =
    (await findPaddleCustomerByEmail(org.owner.email)) ?? undefined;

  if (!customerId) {
    const customer = await paddle.customers.create({
      email: org.owner.email,
      name: org.owner.name ?? org.name,
      customData: { organizationId: org.id },
    });
    customerId = customer.id;
  }

  if (customerId !== org.subscription?.paddleCustomerId) {
    await persistPaddleCustomerId(org.id, customerId);
  }

  return customerId;
}

async function resolvePortalSubscriptionIds(
  customerId: string,
  subscriptionId: string | null | undefined,
) {
  const paddle = getPaddle();
  if (!subscriptionId || !isPaddleSubscriptionId(subscriptionId)) return [];

  try {
    const sub = await paddle.subscriptions.get(subscriptionId);
    if (sub.customerId === customerId) {
      return [subscriptionId];
    }
  } catch {
    // Stale subscription id (e.g. migrated from Stripe) — fall back to listing.
  }

  for await (const sub of paddle.subscriptions.list({
    customerId: [customerId],
    status: ["active", "trialing", "past_due", "paused", "canceled"],
  })) {
    return [sub.id];
  }

  return [];
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const org = await getActiveOrganizationForBilling(session.user.id);
  if (!org) throw new Error("No active organization");

  const snapshot = await getOrgBillingSnapshot(org.id);
  return toBillingSnapshot(snapshot, org.ownerId === session.user.id);
}

export async function createProCheckoutSession(
  interval: "month" | "year",
): Promise<{
  transactionId: string;
  mode: "overlay" | "redirect";
  url: string | null;
}> {
  const { org } = await requireOrgOwnerBillingContext();
  const paddle = getPaddle();
  const customerId = await ensurePaddleCustomer(org);
  const origin = await requestAppOrigin();
  const useOverlay = isLocalhostAppOrigin(origin);
  const checkout = useOverlay ? undefined : await paddleCheckoutConfig();

  try {
    const transaction = await paddle.transactions.create({
      items: [{ priceId: proPriceId(interval), quantity: 1 }],
      customerId,
      customData: { organizationId: org.id },
      ...(checkout ? { checkout } : {}),
    });

    if (useOverlay) {
      return {
        transactionId: transaction.id,
        mode: "overlay",
        url: null,
      };
    }

    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      throw new Error("Failed to create Paddle checkout URL");
    }

    return {
      transactionId: transaction.id,
      mode: "redirect",
      url: checkoutUrl,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code ===
        "transaction_checkout_url_domain_is_not_approved"
    ) {
      const host = new URL(origin).host;
      throw new Error(
        `Checkout return URL domain is not approved by Paddle. Add ${host} under Paddle → Checkout → Website, or set PADDLE_CHECKOUT_RETURN_URL.`,
      );
    }
    throw error;
  }
}

export async function createBillingPortalSession(): Promise<{ url: string }> {
  const { org } = await requireOrgOwnerBillingContext();
  const paddle = getPaddle();
  const customerId = await ensurePaddleCustomer(org);

  const subscriptionIds = await resolvePortalSubscriptionIds(
    customerId,
    org.subscription?.paddleSubscriptionId,
  );

  const session = await paddle.customerPortalSessions.create(
    customerId,
    subscriptionIds,
  );

  const url = resolveCustomerPortalUrl(session);

  if (!url) {
    throw new Error("Failed to create Paddle customer portal session");
  }

  return { url };
}

/** Sync Pro subscription after Paddle checkout redirect. */
export async function confirmProCheckout(
  transactionId: string,
): Promise<ConfirmProCheckoutResult> {
  const { session, org } = await requireOrgOwnerBillingContext();
  const paddle = getPaddle();

  const transaction = await paddle.transactions.get(transactionId);

  const organizationId =
    typeof transaction.customData?.organizationId === "string"
      ? transaction.customData.organizationId
      : null;

  if (!organizationId || organizationId !== org.id) {
    throw new Error("Checkout transaction does not match this organization");
  }

  const completedStatuses = new Set(["completed", "paid", "billed"]);
  const subscriptionId = transaction.subscriptionId;
  if (!completedStatuses.has(transaction.status) && !subscriptionId) {
    return pendingCheckoutSnapshot(
      organizationId,
      "Payment is still processing. Refresh subscription status in a moment.",
    );
  }

  if (!subscriptionId) {
    return pendingCheckoutSnapshot(
      organizationId,
      "Payment was received, but Paddle has not attached a subscription yet. Refresh subscription status in a moment.",
    );
  }

  try {
    await syncPaddleSubscriptionById(subscriptionId, organizationId, (id) =>
      paddle.subscriptions.get(id),
    );
  } catch (error) {
    console.warn(
      "[billing] Paddle checkout subscription sync is pending.",
      error,
    );
    return pendingCheckoutSnapshot(
      organizationId,
      "Payment was received, but subscription details are still syncing from Paddle. Refresh subscription status in a moment.",
    );
  }

  await invalidateBootstrapForOrganization(organizationId);
  await invalidateBootstrapForUser(session.user.id!, org.slug);
  revalidatePath("/dashboard", "layout");

  const snapshot = await getOrgBillingSnapshot(organizationId);
  return toBillingSnapshot(snapshot, true);
}

/** Re-fetch subscription state from Paddle (recovery when webhooks were missed). */
export async function refreshBillingFromPaddle(): Promise<BillingStatus> {
  const { session, org } = await requireOrgOwnerBillingContext();
  await clearLegacyStripeBillingData(org.id);

  const paddle = getPaddle();
  const customerId = await ensurePaddleCustomer(org);
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: org.id },
  });
  const existingSubId = subscription?.paddleSubscriptionId;

  let synced = false;

  if (existingSubId && isPaddleSubscriptionId(existingSubId)) {
    try {
      const sub = await paddle.subscriptions.get(existingSubId);
      if (["active", "trialing", "past_due", "paused"].includes(sub.status)) {
        await syncPaddleSubscriptionToOrg(sub, org.id);
        synced = true;
      }
    } catch {
      // Stale subscription id — list by customer below.
    }
  }

  if (!synced) {
    for await (const sub of paddle.subscriptions.list({
      customerId: [customerId],
    })) {
      if (["active", "trialing", "past_due", "paused"].includes(sub.status)) {
        await syncPaddleSubscriptionToOrg(sub, org.id);
        synced = true;
        break;
      }
    }
  }

  if (!synced) {
    await prisma.subscription.update({
      where: { organizationId: org.id },
      data: {
        plan: "free",
        status: "canceled",
        paddleSubscriptionId: null,
        currentPeriodEnd: null,
      },
    });
  }

  await invalidateBootstrapForOrganization(org.id);
  await invalidateBootstrapForUser(session.user.id!, org.slug);
  revalidatePath("/dashboard", "layout");

  const snapshot = await getOrgBillingSnapshot(org.id);
  return toBillingSnapshot(snapshot, true);
}

export async function redirectToProCheckout(interval: "month" | "year") {
  const session = await createProCheckoutSession(interval);
  if (session.mode === "overlay" || !session.url) {
    throw new Error("Overlay checkout must be started from the billing settings page");
  }
  redirect(session.url);
}

export async function redirectToBillingPortal() {
  const { url } = await createBillingPortalSession();
  redirect(url);
}

export type SubscriptionScheduledChange = {
  action: "cancel" | "pause" | "resume";
  effectiveAt: string;
  resumeAt: string | null;
};

export type SubscriptionManagementDetails = {
  interval: "month" | "year";
  status: string;
  currentPeriodEnd: string | null;
  nextBilledAt: string | null;
  priceFormatted: string;
  currencyCode: string;
  scheduledChange: SubscriptionScheduledChange | null;
  canceledAt: string | null;
  pausedAt: string | null;
};

const ACTIVE_PADDLE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "paused",
]);

type PaddleProrationMode =
  | "do_not_bill"
  | "full_next_billing_period"
  | "prorated_next_billing_period"
  | "prorated_immediately";

function formatPaddleActionError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    const paddleError = error as Error & {
      detail?: string;
      errors?: Array<{ detail?: string; message?: string }>;
    };
    const detail =
      paddleError.detail?.trim() ||
      paddleError.errors?.find((entry) => entry.detail?.trim())?.detail?.trim() ||
      paddleError.errors?.find((entry) => entry.message?.trim())?.message?.trim();
    if (detail) return new Error(detail);
    if (paddleError.message.trim()) return paddleError;
  }

  return new Error(fallback);
}

function prorationModeForIntervalSwitch(
  status: PaddleSubscription["status"],
): PaddleProrationMode {
  if (status === "trialing") return "do_not_bill";
  return "full_next_billing_period";
}

async function revalidateBillingContext(
  organizationId: string,
  userId: string,
  organizationSlug: string,
) {
  await invalidateBootstrapForOrganization(organizationId);
  await invalidateBootstrapForUser(userId, organizationSlug);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/subscription");
}

async function finalizeBillingMutation(
  organizationId: string,
  userId: string,
  organizationSlug: string,
): Promise<BillingStatus> {
  await revalidateBillingContext(organizationId, userId, organizationSlug);
  const snapshot = await getOrgBillingSnapshot(organizationId);
  return toBillingSnapshot(snapshot, true);
}

function resolveSubscriptionInterval(
  subscription: PaddleSubscription,
): "month" | "year" {
  const activeItem =
    subscription.items?.find((item) => item.status === "active") ??
    subscription.items?.[0];
  const priceId = activeItem?.price?.id;

  if (priceId === proPriceId("year")) return "year";
  if (priceId === proPriceId("month")) return "month";

  return subscription.billingCycle?.interval === "year" ? "year" : "month";
}

function toScheduledChange(
  subscription: PaddleSubscription,
): SubscriptionScheduledChange | null {
  const scheduled = subscription.scheduledChange;
  if (!scheduled?.action || !scheduled.effectiveAt) return null;

  return {
    action: scheduled.action,
    effectiveAt: scheduled.effectiveAt,
    resumeAt: scheduled.resumeAt ?? null,
  };
}

function toSubscriptionManagementDetails(
  subscription: PaddleSubscription,
): SubscriptionManagementDetails {
  const activeItem =
    subscription.items?.find((item) => item.status === "active") ??
    subscription.items?.[0];
  const unitPrice = activeItem?.price?.unitPrice;
  const currencyCode = unitPrice?.currencyCode ?? "USD";
  const amount = unitPrice?.amount;
  const priceFormatted =
    amount != null
      ? formatMinorUnitMoney(amount, currencyCode).formatted
      : "—";

  return {
    interval: resolveSubscriptionInterval(subscription),
    status: subscription.status,
    currentPeriodEnd: subscription.currentBillingPeriod?.endsAt ?? null,
    nextBilledAt: subscription.nextBilledAt ?? null,
    priceFormatted,
    currencyCode,
    scheduledChange: toScheduledChange(subscription),
    canceledAt: subscription.canceledAt ?? null,
    pausedAt: subscription.pausedAt ?? null,
  };
}

async function getOrgPaddleSubscription(
  org: NonNullable<Awaited<ReturnType<typeof getActiveOrganizationForBilling>>>,
): Promise<PaddleSubscription> {
  const paddle = getPaddle();
  const subscriptionId = org.subscription?.paddleSubscriptionId;

  if (!subscriptionId || !isPaddleSubscriptionId(subscriptionId)) {
    throw new Error("No Pro subscription found for this organization");
  }

  const subscription = await paddle.subscriptions.get(subscriptionId);
  if (!ACTIVE_PADDLE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    throw new Error("No active Pro subscription found");
  }

  return subscription;
}

export async function getSubscriptionManagementDetails(): Promise<SubscriptionManagementDetails> {
  const { org } = await requireOrgOwnerBillingContext();
  const subscription = await getOrgPaddleSubscription(org);
  return toSubscriptionManagementDetails(subscription);
}

export async function cancelProSubscription(): Promise<BillingStatus> {
  const { session, org } = await requireOrgOwnerBillingContext();
  const subscription = await getOrgPaddleSubscription(org);
  const paddle = getPaddle();

  const updated = await paddle.subscriptions.cancel(subscription.id, {
    effectiveFrom: "next_billing_period",
  });

  await syncPaddleSubscriptionToOrg(updated, org.id);
  return finalizeBillingMutation(org.id, session.user.id!, org.slug);
}

export async function keepProSubscription(): Promise<BillingStatus> {
  const { session, org } = await requireOrgOwnerBillingContext();
  const subscription = await getOrgPaddleSubscription(org);
  const paddle = getPaddle();

  const updated = await paddle.subscriptions.update(subscription.id, {
    scheduledChange: null,
  });

  await syncPaddleSubscriptionToOrg(updated, org.id);
  return finalizeBillingMutation(org.id, session.user.id!, org.slug);
}

export async function resumeProSubscription(): Promise<BillingStatus> {
  const { session, org } = await requireOrgOwnerBillingContext();
  const subscription = await getOrgPaddleSubscription(org);
  const paddle = getPaddle();

  const updated = await paddle.subscriptions.resume(subscription.id, {
    effectiveFrom: "immediately",
  });

  await syncPaddleSubscriptionToOrg(updated, org.id);
  return finalizeBillingMutation(org.id, session.user.id!, org.slug);
}

export async function switchProSubscriptionInterval(
  interval: "month" | "year",
): Promise<BillingStatus> {
  const { session, org } = await requireOrgOwnerBillingContext();

  try {
    const subscription = await getOrgPaddleSubscription(org);
    const currentInterval = resolveSubscriptionInterval(subscription);

    if (currentInterval === interval) {
      throw new Error(
        `This subscription is already on ${interval === "year" ? "yearly" : "monthly"} billing`,
      );
    }

    if (subscription.scheduledChange?.action === "cancel") {
      throw new Error(
        "Remove the scheduled cancellation before changing billing cycle.",
      );
    }

    const activeItem =
      subscription.items?.find((item) => item.status === "active") ??
      subscription.items?.[0];
    const paddle = getPaddle();

    const updated = await paddle.subscriptions.update(subscription.id, {
      items: [
        {
          priceId: proPriceId(interval),
          quantity: activeItem?.quantity ?? 1,
        },
      ],
      prorationBillingMode: prorationModeForIntervalSwitch(subscription.status),
    });

    await syncPaddleSubscriptionToOrg(updated, org.id);
    return finalizeBillingMutation(org.id, session.user.id!, org.slug);
  } catch (error) {
    throw formatPaddleActionError(
      error,
      "Could not change billing cycle. Try again or refresh subscription status.",
    );
  }
}
