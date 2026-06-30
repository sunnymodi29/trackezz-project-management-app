-- Rename Stripe billing columns to Paddle
ALTER TABLE "Subscription" RENAME COLUMN "stripeCustomerId" TO "paddleCustomerId";
ALTER TABLE "Subscription" RENAME COLUMN "stripeSubscriptionId" TO "paddleSubscriptionId";

ALTER INDEX "Subscription_stripeCustomerId_key" RENAME TO "Subscription_paddleCustomerId_key";
ALTER INDEX "Subscription_stripeSubscriptionId_key" RENAME TO "Subscription_paddleSubscriptionId_key";
