import { redirect } from "next/navigation";
import { ManageSubscriptionSettings } from "@/components/settings/manage-subscription-settings";
import {
  getBillingStatus,
  getSubscriptionManagementDetails,
} from "@/lib/actions/billing";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage subscription" };

export default async function ManageSubscriptionPage() {
  try {
    const [billing, details] = await Promise.all([
      getBillingStatus(),
      getSubscriptionManagementDetails(),
    ]);

    if (!billing.canManageBilling) {
      redirect("/dashboard/settings");
    }

    if (!billing.isPro && details.status === "canceled") {
      redirect("/dashboard/settings?tab=billing");
    }

    return (
      <ManageSubscriptionSettings
        initialDetails={details}
        initialBilling={billing}
      />
    );
  } catch {
    redirect("/dashboard/settings?tab=billing");
  }
}
