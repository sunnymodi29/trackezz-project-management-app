import type { CustomerPortalSession } from "@paddle/paddle-node-sdk";

export function resolveCustomerPortalUrl(
  session: CustomerPortalSession,
): string | null {
  const subscription = session.urls?.subscriptions?.[0];

  return (
    subscription?.updateSubscriptionPaymentMethod ??
    subscription?.cancelSubscription ??
    session.urls?.general?.overview ??
    null
  );
}
