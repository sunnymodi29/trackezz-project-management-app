export type PlanId = "free" | "pro";

export type PlanLimits = {
  maxMembers: number | null;
  maxAiMessagesPerMonth: number | null;
  maxStorageBytes: number | null;
  analyticsTier: "basic" | "full";
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxMembers: 10,
    maxAiMessagesPerMonth: 50,
    maxStorageBytes: 100 * 1024 * 1024,
    analyticsTier: "basic",
  },
  pro: {
    maxMembers: null,
    maxAiMessagesPerMonth: null,
    maxStorageBytes: 10 * 1024 * 1024 * 1024,
    analyticsTier: "full",
  },
};

export const PRO_TRIAL_DAYS = 14;

export const PRO_PRICE_MONTHLY_USD = 5.99;
export const PRO_PRICE_ANNUAL_TOTAL_USD = 65.88;
export const PRO_PRICE_ANNUAL_MONTHLY_USD =
  Math.round((PRO_PRICE_ANNUAL_TOTAL_USD / 12) * 100) / 100;

export function formatUsd(amount: number): string {
  const cents = Math.round(amount * 100) % 100;
  return cents === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function proAnnualSavingsPercent(): number {
  const monthlyYear = PRO_PRICE_MONTHLY_USD * 12;
  return Math.round(
    ((monthlyYear - PRO_PRICE_ANNUAL_TOTAL_USD) / monthlyYear) * 100,
  );
}

export const FREE_PLAN_FEATURES = [
  "Unlimited projects",
  "Up to 10 members",
  "50 AI assistant messages / month",
  "Unlimited MCP / PAT",
  "Basic analytics",
  "100 MB file storage",
] as const;

export const PRO_PLAN_FEATURES = [
  "Everything in Free",
  "Unlimited members",
  "Unlimited AI assistant messages",
  "Full analytics",
  "10 GB file storage",
  "14-day free trial",
] as const;

export function planFromString(value: string | null | undefined): PlanId {
  return value === "pro" ? "pro" : "free";
}

export function isProPlanActive(
  plan: string,
  status: string,
): boolean {
  if (plan !== "pro") return false;
  return (
    status === "active" || status === "trialing" || status === "past_due"
  );
}
