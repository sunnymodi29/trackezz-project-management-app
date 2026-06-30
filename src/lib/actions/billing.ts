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
import { PLAN_LIMITS } from "@/lib/billing/plans";
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
