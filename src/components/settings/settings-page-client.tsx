"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Building2, Key, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/store/data-store";
import { UserProfileSettings } from "@/components/settings/user-profile-settings";
import { OrganizationSettings } from "@/components/settings/organization-settings";
import { ApiTokensSettings } from "@/components/settings/api-tokens-settings";
import { BillingSettings } from "@/components/settings/billing-settings";

type SettingsTab = "profile" | "organization" | "pat" | "billing";

const VALID_TABS = new Set<SettingsTab>([
  "profile",
  "organization",
  "pat",
  "billing",
]);

export function SettingsPageClient() {
  return (
    <Suspense>
      <SettingsPageClientInner />
    </Suspense>
  );
}

function SettingsPageClientInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions, hydrated } = useDataStore();
  const canManageOrg = permissions.isOrgOwner;
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam && VALID_TABS.has(tabParam as SettingsTab)
      ? (tabParam as SettingsTab)
      : "profile";
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (!hydrated) return;
    if (!tabParam || !VALID_TABS.has(tabParam as SettingsTab)) return;

    const requestedTab = tabParam as SettingsTab;
    if (
      !canManageOrg &&
      (requestedTab === "organization" || requestedTab === "billing")
    ) {
      setTab("profile");
      return;
    }

    setTab(requestedTab);
  }, [canManageOrg, hydrated, tabParam]);

  useEffect(() => {
    if (!hydrated) return;
    if (!canManageOrg && (tab === "organization" || tab === "billing")) {
      setTab("profile");
      router.replace("/dashboard/settings");
    }
  }, [canManageOrg, hydrated, router, tab]);

  const selectTab = (nextTab: SettingsTab) => {
    setTab(nextTab);

    const href =
      nextTab === "profile"
        ? "/dashboard/settings"
        : `/dashboard/settings?tab=${nextTab}`;
    router.replace(href);
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-8 overflow-x-hidden">
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {canManageOrg
              ? "Your profile, billing, and organization preferences."
              : "Your profile and account preferences."}
          </p>
        </div>

        <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1 sm:w-fit sm:flex-wrap">
          <TabButton
            active={tab === "profile"}
            onClick={() => selectTab("profile")}
            icon={<User className="h-4 w-4" />}
            label="Profile"
          />
          <TabButton
            active={tab === "pat"}
            onClick={() => selectTab("pat")}
            icon={<Key className="h-4 w-4" />}
            label="PAT & pat"
          />
          {canManageOrg && (
            <>
              <TabButton
                active={tab === "billing"}
                onClick={() => selectTab("billing")}
                icon={<CreditCard className="h-4 w-4" />}
                label="Billing"
              />
              <TabButton
                active={tab === "organization"}
                onClick={() => selectTab("organization")}
                icon={<Building2 className="h-4 w-4" />}
                label="Organization"
              />
            </>
          )}
        </div>
      </div>

      <div key={tab} className="relative isolate overflow-hidden">
        {tab === "pat" ? (
          <ApiTokensSettings />
        ) : tab === "billing" && canManageOrg ? (
          <BillingSettings />
        ) : tab === "organization" && canManageOrg ? (
          <OrganizationSettings />
        ) : (
          <UserProfileSettings />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-10 shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:min-h-0",
        active
          ? "bg-accent text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
