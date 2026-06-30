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

export type MoneyAmount = {
  amount: number;
  currencyCode: string;
  formatted: string;
};

export type ProPlanPricing = {
  monthly: MoneyAmount;
  annual: MoneyAmount;
  annualMonthly: MoneyAmount;
  annualSavingsPercent: number;
  monthlyTrialDays: number;
  annualTrialDays: number;
};

export function formatUsd(amount: number): string {
  const cents = Math.round(amount * 100) % 100;
  return cents === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

export function formatMinorUnitMoney(
  minorUnitAmount: string | number,
  currencyCode: string,
): MoneyAmount {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  const divisor = 10 ** fractionDigits;
  const amount = Number(minorUnitAmount) / divisor;

  return {
    amount,
    currencyCode,
    formatted: formatter.format(amount),
  };
}

export function proAnnualSavingsPercent(
  pricing: Pick<ProPlanPricing, "monthly" | "annual"> = {
    monthly: {
      amount: PRO_PRICE_MONTHLY_USD,
      currencyCode: "USD",
      formatted: formatUsd(PRO_PRICE_MONTHLY_USD),
    },
    annual: {
      amount: PRO_PRICE_ANNUAL_TOTAL_USD,
      currencyCode: "USD",
      formatted: formatUsd(PRO_PRICE_ANNUAL_TOTAL_USD),
    },
  },
): number {
  const monthlyYear = pricing.monthly.amount * 12;
  if (monthlyYear <= 0) return 0;
  return Math.round(
    ((monthlyYear - pricing.annual.amount) / monthlyYear) * 100,
  );
}

export const DEFAULT_PRO_PLAN_PRICING: ProPlanPricing = {
  monthly: {
    amount: PRO_PRICE_MONTHLY_USD,
    currencyCode: "USD",
    formatted: formatUsd(PRO_PRICE_MONTHLY_USD),
  },
  annual: {
    amount: PRO_PRICE_ANNUAL_TOTAL_USD,
    currencyCode: "USD",
    formatted: formatUsd(PRO_PRICE_ANNUAL_TOTAL_USD),
  },
  annualMonthly: {
    amount: PRO_PRICE_ANNUAL_MONTHLY_USD,
    currencyCode: "USD",
    formatted: formatUsd(PRO_PRICE_ANNUAL_MONTHLY_USD),
  },
  annualSavingsPercent: proAnnualSavingsPercent(),
  monthlyTrialDays: PRO_TRIAL_DAYS,
  annualTrialDays: PRO_TRIAL_DAYS,
};

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
