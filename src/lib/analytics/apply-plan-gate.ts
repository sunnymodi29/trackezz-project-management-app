import type { OrgAnalytics } from "@/lib/analytics/types";

const EMPTY_PRO_ANALYTICS: Pick<
  OrgAnalytics,
  | "burndown"
  | "velocity"
  | "statusDistribution"
  | "priorityDistribution"
  | "typeDistribution"
  | "projectHealth"
  | "weeklyCreated"
  | "dailyThroughput"
  | "assigneeLoad"
> = {
  burndown: [],
  velocity: [],
  statusDistribution: [],
  priorityDistribution: [],
  typeDistribution: [],
  projectHealth: [],
  weeklyCreated: [],
  dailyThroughput: [],
  assigneeLoad: [],
};

/** Strip Pro-only analytics series for Free plans (server and client). */
export function applyAnalyticsPlanGate(
  analytics: OrgAnalytics,
  isPro: boolean,
): OrgAnalytics {
  if (isPro) return analytics;

  return {
    ...analytics,
    ...EMPTY_PRO_ANALYTICS,
  };
}
