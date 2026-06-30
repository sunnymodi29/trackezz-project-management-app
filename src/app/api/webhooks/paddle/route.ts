import { NextResponse } from "next/server";
import { EventName } from "@paddle/paddle-node-sdk";
import { prisma } from "@/lib/db";
import { getPaddle, paddleWebhookSecret } from "@/lib/paddle";
import {
  resolveOrganizationIdFromPaddleCustomData,
  resolveOrganizationIdFromPaddleSubscription,
  syncPaddleSubscriptionById,
  syncPaddleSubscriptionToOrg,
} from "@/lib/billing/sync-paddle-subscription";
import { invalidateBootstrapForOrganization } from "@/lib/org/cache";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const signature = req.headers.get("paddle-signature");
  if (!signature) {
    console.warn("[paddle webhook] Rejected request with missing paddle-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = await getPaddle().webhooks.unmarshal(
      rawBody,
      paddleWebhookSecret(),
      signature,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.warn("[paddle webhook] Rejected request during signature verification", {
      message,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let organizationId: string | null = null;

  try {
    switch (event.eventType) {
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated: {
        const subscription = event.data;
        organizationId =
          resolveOrganizationIdFromPaddleSubscription(subscription) ??
          (
            await prisma.subscription.findFirst({
              where: { paddleSubscriptionId: subscription.id },
              select: { organizationId: true },
            })
          )?.organizationId ??
          null;
        if (!organizationId) break;
        await syncPaddleSubscriptionToOrg(subscription, organizationId);
        break;
      }
      case EventName.SubscriptionCanceled:
      case EventName.SubscriptionPastDue: {
        const subscription = event.data;
        organizationId =
          resolveOrganizationIdFromPaddleSubscription(subscription) ??
          (
            await prisma.subscription.findFirst({
              where: { paddleSubscriptionId: subscription.id },
              select: { organizationId: true },
            })
          )?.organizationId ??
          null;
        if (!organizationId) break;
        await syncPaddleSubscriptionToOrg(subscription, organizationId);
        break;
      }
      case EventName.TransactionCompleted: {
        const transaction = event.data;
        organizationId =
          resolveOrganizationIdFromPaddleCustomData(
            transaction.customData as Record<string, unknown> | undefined,
          ) ??
          null;
        const subscriptionId = transaction.subscriptionId;
        if (!organizationId || !subscriptionId) break;
        await syncPaddleSubscriptionById(subscriptionId, organizationId, (id) =>
          getPaddle().subscriptions.get(id),
        );
        break;
      }
      default:
        break;
    }

    if (organizationId) {
      await invalidateBootstrapForOrganization(organizationId);
    }
  } catch (err) {
    console.error("[paddle webhook]", event.eventType, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
