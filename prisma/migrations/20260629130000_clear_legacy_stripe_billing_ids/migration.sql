-- Stripe IDs were preserved when stripe* columns were renamed to paddle*.
-- Clear them so billing syncs from Paddle instead of stale Stripe records.

UPDATE "Subscription"
SET
  "paddleCustomerId" = NULL,
  "updatedAt" = NOW()
WHERE "paddleCustomerId" LIKE 'cus_%';

UPDATE "Subscription"
SET
  "paddleSubscriptionId" = NULL,
  "plan" = 'free',
  "status" = 'active',
  "currentPeriodEnd" = NULL,
  "updatedAt" = NOW()
WHERE "paddleSubscriptionId" IS NOT NULL
  AND "paddleSubscriptionId" NOT LIKE 'sub_01%';
