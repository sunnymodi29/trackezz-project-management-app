import { prisma } from "@/lib/db";

export const AI_MESSAGE_METRIC = "ai_messages";

export function currentUsagePeriod(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getAiMessageUsage(
  organizationId: string,
  period = currentUsagePeriod(),
): Promise<number> {
  const row = await prisma.usageMetric.findUnique({
    where: {
      organizationId_metric_period: {
        organizationId,
        metric: AI_MESSAGE_METRIC,
        period,
      },
    },
    select: { count: true },
  });
  return row?.count ?? 0;
}

export async function incrementAiMessageUsage(
  organizationId: string,
  amount = 1,
): Promise<number> {
  const period = currentUsagePeriod();
  const row = await prisma.usageMetric.upsert({
    where: {
      organizationId_metric_period: {
        organizationId,
        metric: AI_MESSAGE_METRIC,
        period,
      },
    },
    create: {
      organizationId,
      metric: AI_MESSAGE_METRIC,
      period,
      count: amount,
    },
    update: {
      count: { increment: amount },
    },
    select: { count: true },
  });
  return row.count;
}

export async function getOrganizationMemberCount(
  organizationId: string,
): Promise<number> {
  return prisma.organizationMember.count({
    where: { organizationId },
  });
}

export async function getOrganizationStorageBytes(
  organizationId: string,
): Promise<number> {
  const result = await prisma.attachment.aggregate({
    where: {
      issue: { project: { organizationId } },
    },
    _sum: { size: true },
  });
  return result._sum.size ?? 0;
}
