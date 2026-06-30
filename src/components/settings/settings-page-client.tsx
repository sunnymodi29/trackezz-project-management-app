"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { User, Building2, Key, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/store/data-store";
import { UserProfileSettings } from "@/components/settings/user-profile-settings";
import { OrganizationSettings } from "@/components/settings/organization-settings";
import { ApiTokensSettings } from "@/components/settings/api-tokens-settings";
import { BillingSettings } from "@/components/settings/billing-settings";

type SettingsTab = "profile" | "organization" | "api" | "billing";

const VALID_TABS = new Set<SettingsTab>([
  "profile",
  "organization",
  "api",
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
  const searchParams = useSearchParams();
  const { permissions } = useDataStore();
  const canManageOrg = permissions.isOrgOwner;
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam && VALID_TABS.has(tabParam as SettingsTab)
      ? (tabParam as SettingsTab)
      : "profile";
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (tabParam && VALID_TABS.has(tabParam as SettingsTab)) {
      setTab(tabParam as SettingsTab);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!canManageOrg && (tab === "organization" || tab === "billing")) {
      setTab("profile");
    }
  }, [canManageOrg, tab]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {canManageOrg
              ? "Your profile, billing, and organization preferences."
              : "Your profile and account preferences."}
          </p>
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit flex-wrap">
          <TabButton
            active={tab === "profile"}
            onClick={() => setTab("profile")}
            icon={<User className="h-4 w-4" />}
            label="Profile"
          />
          <TabButton
            active={tab === "api"}
            onClick={() => setTab("api")}
            icon={<Key className="h-4 w-4" />}
            label="PAT & MCP"
          />
          {canManageOrg && (
            <>
              <TabButton
                active={tab === "billing"}
                onClick={() => setTab("billing")}
                icon={<CreditCard className="h-4 w-4" />}
                label="Billing"
              />
              <TabButton
                active={tab === "organization"}
                onClick={() => setTab("organization")}
                icon={<Building2 className="h-4 w-4" />}
                label="Organization"
              />
            </>
          )}
        </div>
      </div>

      <div key={tab} className="relative isolate overflow-hidden">
        {tab === "api" ? (
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
        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
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
