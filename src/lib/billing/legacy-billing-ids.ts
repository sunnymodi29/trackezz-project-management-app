/** Stripe customer IDs migrated into paddleCustomerId after the column rename. */
export function isLegacyStripeCustomerId(
  id: string | null | undefined,
): boolean {
  return id?.startsWith("cus_") ?? false;
}

export function isPaddleCustomerId(
  id: string | null | undefined,
): id is string {
  return id?.startsWith("ctm_") ?? false;
}

/** Paddle subscription IDs use ULIDs: sub_01 + 24 chars. */
export function isPaddleSubscriptionId(
  id: string | null | undefined,
): id is string {
  return Boolean(id?.startsWith("sub_01") && id.length >= 28);
}

/** Stripe subscription IDs were copied into paddleSubscriptionId during migration. */
export function isLegacyStripeSubscriptionId(
  id: string | null | undefined,
): boolean {
  if (!id?.startsWith("sub_")) return false;
  return !isPaddleSubscriptionId(id);
}

export function hasLegacyStripeBillingIds(subscription: {
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
} | null): boolean {
  if (!subscription) return false;
  return (
    isLegacyStripeCustomerId(subscription.paddleCustomerId) ||
    isLegacyStripeSubscriptionId(subscription.paddleSubscriptionId)
  );
}
