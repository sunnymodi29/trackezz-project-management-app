import { applyAnalyticsPlanGate } from "@/lib/analytics/apply-plan-gate";
import { computeOrgAnalytics } from "@/lib/analytics/compute";
import type { OrgAnalytics } from "@/lib/analytics/types";
import { getBootstrapData } from "@/lib/queries/bootstrap";

export async function getOrgAnalytics(
  projectId: string | null = null,
): Promise<OrgAnalytics> {
  const data = await getBootstrapData();
  const isPro = data.billing?.isPro ?? false;
  const analytics = computeOrgAnalytics(data, projectId);
  return applyAnalyticsPlanGate(analytics, isPro);
}
