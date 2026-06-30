import { cn } from "@/lib/utils";

export function billingIntervalToggleContainerClass(isDark: boolean) {
  return cn(
    "inline-flex rounded-lg border border-border/70 p-0.5",
    isDark ? "bg-muted/25" : "bg-muted/50",
  );
}

export function billingIntervalToggleButtonClass(
  active: boolean,
  isDark: boolean,
) {
  if (!active) {
    return "text-muted-foreground hover:bg-muted/60 hover:text-foreground";
  }

  return isDark
    ? "bg-primary/25 text-primary-foreground shadow-sm ring-1 ring-inset ring-primary/35"
    : "bg-violet-100 text-violet-900 shadow-sm ring-1 ring-inset ring-violet-300/70";
}

export function billingIntervalToggleBadgeClass(active: boolean, isDark: boolean) {
  if (active) {
    return isDark
      ? "bg-primary-foreground/15 text-primary-foreground"
      : "bg-violet-200/90 text-violet-950";
  }

  return isDark
    ? "bg-primary/10 text-primary"
    : "bg-violet-100 text-violet-800";
}

export function billingCycleOptionClass(active: boolean, isDark: boolean) {
  if (!active) {
    return "text-muted-foreground hover:text-foreground hover:bg-muted/50";
  }

  return isDark
    ? "bg-primary/25 text-primary-foreground shadow-sm ring-1 ring-inset ring-primary/35"
    : "bg-violet-100 text-violet-900 shadow-sm ring-1 ring-inset ring-violet-300/70";
}

export function billingCycleSaveBadgeClass(isDark: boolean) {
  return cn(
    "absolute -top-2 right-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1",
    isDark
      ? "bg-primary text-primary-foreground ring-primary/10"
      : "bg-violet-200/90 text-violet-950 ring-violet-300/60",
  );
}

export function subscriptionStatusBadgeClass(
  status: string,
  isDark: boolean,
): string {
  const styles: Record<string, string> = {
    active: isDark
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    trialing: "bg-primary/10 text-primary border-primary/20",
    past_due: isDark
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-amber-500/10 text-amber-600 border-amber-500/20",
    canceled: "bg-muted text-muted-foreground border-border",
  };

  return styles[status] ?? styles.canceled;
}
