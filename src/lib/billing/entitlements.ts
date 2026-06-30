import { prisma } from "@/lib/db";
import {
  isProPlanActive,
  planFromString,
  PLAN_LIMITS,
  type PlanId,
} from "@/lib/billing/plans";
import {
  getAiMessageUsage,
  getOrganizationMemberCount,
  getOrganizationStorageBytes,
  incrementAiMessageUsage,
} from "@/lib/billing/usage";

export class PlanLimitError extends Error {
  readonly code = "PLAN_LIMIT";

  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export type OrgBillingSnapshot = {
  plan: PlanId;
  status: string;
  isPro: boolean;
  currentPeriodEnd: Date | null;
  usage: {
    members: number;
    aiMessagesThisMonth: number;
    storageBytes: number;
  };
};

export async function getOrgSubscription(organizationId: string) {
  return prisma.subscription.findUnique({
    where: { organizationId },
  });
}

export async function ensureOrgSubscription(organizationId: string) {
  const existing = await getOrgSubscription(organizationId);
  if (existing) return existing;

  return prisma.subscription.create({
    data: {
      organizationId,
      plan: "free",
      status: "active",
    },
  });
}

export async function getOrgBillingSnapshot(
  organizationId: string,
): Promise<OrgBillingSnapshot> {
  const subscription = await ensureOrgSubscription(organizationId);
  const plan = planFromString(subscription.plan);
  const isPro = isProPlanActive(subscription.plan, subscription.status);

  const [members, aiMessagesThisMonth, storageBytes] = await Promise.all([
    getOrganizationMemberCount(organizationId),
    getAiMessageUsage(organizationId),
    getOrganizationStorageBytes(organizationId),
  ]);

  return {
    plan: isPro ? "pro" : plan,
    status: subscription.status,
    isPro,
    currentPeriodEnd: subscription.currentPeriodEnd,
    usage: {
      members,
      aiMessagesThisMonth,
      storageBytes,
    },
  };
}

export function getEffectivePlanId(snapshot: OrgBillingSnapshot): PlanId {
  return snapshot.isPro ? "pro" : "free";
}

export async function assertMemberCapacity(organizationId: string) {
  const snapshot = await getOrgBillingSnapshot(organizationId);
  const limits = PLAN_LIMITS[getEffectivePlanId(snapshot)];
  if (
    limits.maxMembers != null &&
    snapshot.usage.members >= limits.maxMembers
  ) {
    throw new PlanLimitError(
      `Member limit reached (${limits.maxMembers} on Free). Upgrade to Pro for unlimited members.`,
    );
  }
}

export async function assertAiMessageCapacity(organizationId: string) {
  const snapshot = await getOrgBillingSnapshot(organizationId);
  const limits = PLAN_LIMITS[getEffectivePlanId(snapshot)];
  if (
    limits.maxAiMessagesPerMonth != null &&
    snapshot.usage.aiMessagesThisMonth >= limits.maxAiMessagesPerMonth
  ) {
    throw new PlanLimitError(
      `AI assistant limit reached (${limits.maxAiMessagesPerMonth}/month on Free). Upgrade to Pro for unlimited messages.`,
    );
  }
}

export async function recordAiMessageUsage(organizationId: string) {
  await assertAiMessageCapacity(organizationId);
  await incrementAiMessageUsage(organizationId);
}

export async function assertStorageCapacity(
  organizationId: string,
  additionalBytes: number,
) {
  const snapshot = await getOrgBillingSnapshot(organizationId);
  const limits = PLAN_LIMITS[getEffectivePlanId(snapshot)];
  if (limits.maxStorageBytes == null) return;

  const nextTotal = snapshot.usage.storageBytes + additionalBytes;
  if (nextTotal > limits.maxStorageBytes) {
    const limitMb = Math.round(limits.maxStorageBytes / (1024 * 1024));
    throw new PlanLimitError(
      `Storage limit exceeded (${limitMb} MB on Free). Upgrade to Pro for 10 GB.`,
    );
  }
}

export function hasFullAnalytics(snapshot: OrgBillingSnapshot): boolean {
  return PLAN_LIMITS[getEffectivePlanId(snapshot)].analyticsTier === "full";
}
