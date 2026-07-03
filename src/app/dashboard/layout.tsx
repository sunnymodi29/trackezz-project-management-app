import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { DashboardDataProvider } from "@/components/dashboard-data-provider";
import { DashboardPageLoader } from "@/components/dashboard-page-loader";
import { NoWorkspaceShell } from "@/components/no-workspace-shell";
import { getBootstrapData } from "@/lib/queries/bootstrap";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardPageLoader label="Loading dashboard" />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

async function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getBootstrapData();

  if (!data.hasWorkspace) {
    return (
      <DashboardDataProvider data={data}>
        <NoWorkspaceShell />
      </DashboardDataProvider>
    );
  }

  return (
    <DashboardDataProvider data={data}>
      <AppShell>{children}</AppShell>
    </DashboardDataProvider>
  );
}
