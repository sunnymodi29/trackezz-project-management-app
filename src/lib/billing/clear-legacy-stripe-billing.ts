import { prisma } from "@/lib/db";
import {
  hasLegacyStripeBillingIds,
  isLegacyStripeCustomerId,
  isLegacyStripeSubscriptionId,
} from "@/lib/billing/legacy-billing-ids";

/** Remove Stripe IDs that were left in Paddle columns after the schema rename. */
export async function clearLegacyStripeBillingData(
  organizationId: string,
): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });
  if (!subscription || !hasLegacyStripeBillingIds(subscription)) {
    return false;
  }

  const data: {
    paddleCustomerId?: null;
    paddleSubscriptionId?: null;
    plan?: string;
    status?: "active";
    currentPeriodEnd?: null;
  } = {};

  if (isLegacyStripeCustomerId(subscription.paddleCustomerId)) {
    data.paddleCustomerId = null;
  }

  if (isLegacyStripeSubscriptionId(subscription.paddleSubscriptionId)) {
    data.paddleSubscriptionId = null;
    data.plan = "free";
    data.status = "active";
    data.currentPeriodEnd = null;
  }

  await prisma.subscription.update({
    where: { organizationId },
    data,
  });

  return true;
}
