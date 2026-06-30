import type { Subscription as PaddleSubscription } from "@paddle/paddle-node-sdk";
import { prisma } from "@/lib/db";

export function mapPaddleSubscriptionStatus(
  status: PaddleSubscription["status"],
): "active" | "trialing" | "past_due" | "canceled" {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "paused":
      return "active";
    default:
      return "active";
  }
}

function subscriptionPeriodEnd(
  paddleSubscription: PaddleSubscription,
): Date | null {
  const endsAt = paddleSubscription.currentBillingPeriod?.endsAt;
  if (!endsAt) return null;
  const date = new Date(endsAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function organizationIdFromCustomData(
  customData: Record<string, unknown> | null | undefined,
): string | null {
  const value = customData?.organizationId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function syncPaddleSubscriptionToOrg(
  paddleSubscription: PaddleSubscription,
  organizationId: string,
) {
  const status = mapPaddleSubscriptionStatus(paddleSubscription.status);
  const isPaid =
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    paddleSubscription.status === "paused";

  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      paddleCustomerId: paddleSubscription.customerId,
      paddleSubscriptionId: paddleSubscription.id,
      status,
      plan: isPaid ? "pro" : "free",
      currentPeriodEnd: subscriptionPeriodEnd(paddleSubscription),
    },
    update: {
      paddleCustomerId: paddleSubscription.customerId,
      paddleSubscriptionId: paddleSubscription.id,
      status,
      plan: isPaid ? "pro" : "free",
      currentPeriodEnd: subscriptionPeriodEnd(paddleSubscription),
    },
  });
}

export async function syncPaddleSubscriptionById(
  subscriptionId: string,
  organizationId: string,
  retrieve: (id: string) => Promise<PaddleSubscription>,
) {
  const paddleSubscription = await retrieve(subscriptionId);
  await syncPaddleSubscriptionToOrg(paddleSubscription, organizationId);
}

export function resolveOrganizationIdFromPaddleSubscription(
  paddleSubscription: PaddleSubscription,
): string | null {
  return organizationIdFromCustomData(
    paddleSubscription.customData as Record<string, unknown> | undefined,
  );
}

export function resolveOrganizationIdFromPaddleCustomData(
  customData: Record<string, unknown> | null | undefined,
): string | null {
  return organizationIdFromCustomData(customData);
}
