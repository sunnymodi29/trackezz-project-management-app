"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from "@/components/ui";
import { OrganizationMembersSettings } from "@/components/organization-members-settings";
import { useDataStore } from "@/store/data-store";
import { updateOrganization } from "@/lib/actions/organization";

export function OrganizationSettings() {
  const router = useRouter();
  const { organization, permissions, patchOrganization } = useDataStore();
  const [name, setName] = useState(organization?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  

  const canEditOrg = permissions.isOrgOwner;

  if (!organization) return null;

  const handleSave = async () => {
    if (!canEditOrg) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateOrganization({
        organizationId: organization.id,
        name,
      });
      patchOrganization({ name: updated.name });
      setSuccess(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEditOrg}
              maxLength={100}
            />
            {!canEditOrg && (
              <p className="text-xs text-muted-foreground">
                Only the organization owner can change the name.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Slug</label>
            <Input value={organization.slug} disabled className="font-mono text-xs" />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 rounded-md px-3 py-2">
              Organization updated.
            </p>
          )}

          {canEditOrg && (
            <Button
              onClick={() => void handleSave()}
              disabled={saving || !name.trim() || name.trim() === organization.name}
            >
              {saving ? "Saving…" : "Save organization"}
            </Button>
          )}
        </CardContent>
      </Card>

      <OrganizationMembersSettings />
    </div>
  );
}
