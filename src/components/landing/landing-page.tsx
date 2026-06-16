"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Zap,
  ArrowRight,
  SquareKanban,
  ListTodo,
  Target,
  Bug,
  Calendar,
  BarChart2,
  Users,
  MessageSquare,
  Command,
  GitBranch,
  Check,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  Layers,
  Inbox,
  LayoutDashboard,
} from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useRouter } from "next/navigation";

const DASHBOARD_HREF = "/dashboard";

function useIsSignedIn() {
  const { status, data } = useSession();
  return {
    isSignedIn: status === "authenticated" && !!data?.user,
    isLoading: status === "loading",
  };
}

function NavAuthSkeleton() {
  return (
    <>
      <Skeleton className="hidden h-8 w-16 rounded-md sm:block" />
      <Skeleton className="hidden h-8 w-22 rounded-md sm:block" />
    </>
  );
}

function HeroCtaSkeleton() {
  return (
    <>
      <Skeleton className="h-12 w-full rounded-md sm:w-36" />
      <Skeleton className="h-12 w-full rounded-md sm:w-44" />
    </>
  );
}

function CtaButtonSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-11 w-full rounded-md", className)} />;
}

function CtaSubtextSkeleton() {
  return <Skeleton className="mx-auto mt-4 h-3 w-56 max-w-full rounded" />;
}

function useBeginDashboardTransition() {
  const beginRouteTransition = useAppStore((s) => s.beginRouteTransition);
  return () => beginRouteTransition(DASHBOARD_HREF, { fullScreen: true });
}

function DashboardLink({
  children,
  className,
  onNavigate,
}: {
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  const beginDashboardTransition = useBeginDashboardTransition();

  return (
    <Link
      href={DASHBOARD_HREF}
      className={className}
      onClick={() => {
        beginDashboardTransition();
        onNavigate?.();
      }}
    >
      {children}
    </Link>
  );
}

function GoToDashboardButton({
  size = "sm",
  className,
  showIcon = false,
}: {
  size?: "sm" | "lg";
  className?: string;
  showIcon?: boolean;
}) {
  return (
    <DashboardLink>
      <Button size={size} className={cn(showIcon && "gap-2", className)}>
        {showIcon ? <LayoutDashboard className="h-4 w-4" /> : null}
        Go to Dashboard
        {size === "lg" ? <ArrowRight className="ml-2 h-5 w-5" /> : null}
      </Button>
    </DashboardLink>
  );
}

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#product", label: "Product" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const FEATURES = [
  {
    icon: ListTodo,
    title: "Issues & workflows",
    description:
      "Create tasks, bugs, stories, and epics with rich descriptions, custom statuses, priorities, and labels.",
  },
  {
    icon: SquareKanban,
    title: "Kanban board",
    description:
      "Drag issues across columns that match your workflow. Add issues directly from any column.",
  },
  {
    icon: Target,
    title: "Sprints & backlog",
    description:
      "Plan iterations, move work from backlog to active sprints, and keep delivery predictable.",
  },
  {
    icon: Bug,
    title: "Bug tracking",
    description:
      "Dedicated bug views with severity, environment, and reproduction steps built in.",
  },
  {
    icon: Calendar,
    title: "Calendar & due dates",
    description:
      "Schedule deadlines on a project calendar and drag issues to set due dates instantly.",
  },
  {
    icon: Users,
    title: "Teams & invites",
    description:
      "Invite teammates by email, manage project members, and collaborate on issues together.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Create a project",
    description:
      "Set up a workspace with your team, workflow columns, and project key.",
  },
  {
    step: "02",
    title: "Plan & prioritize",
    description:
      "Break work into issues, assign owners, add to sprints, and track progress on the board.",
  },
  {
    step: "03",
    title: "Ship with clarity",
    description:
      "Comment, share links, review analytics, and move work to done with full audit history.",
  },
];

const PRICING_FEATURES = [
  "Unlimited projects & issues",
  "Kanban, backlog & sprints",
  "Custom workflow statuses",
  "Rich text & file attachments",
  "Team invites & member roles",
  "Dark & light themes",
];

const FAQ_ITEMS = [
  {
    q: "Is TrackEzz free to use?",
    a: "Yes. TrackEzz is free to start while we’re in early access. Create an account, invite your team, and run your projects without a credit card.",
  },
  {
    q: "Can I use Google to sign in?",
    a: "If your workspace admin has enabled Google OAuth, you can sign in with Google from the login page. Email and password registration is always available.",
  },
  {
    q: "What can I track in a project?",
    a: "Issues (tasks, bugs, features, stories, epics), sprints, backlog items, due dates, assignees, comments, labels, and custom workflow statuses.",
  },
  {
    q: "Is there a mobile app?",
    a: "TrackEzz is a responsive web app that works on desktop and mobile browsers. A dedicated mobile app is on the roadmap.",
  },
];

type PreviewTab = "board" | "issues" | "sprints";

function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const icon = size === "sm" ? "h-3 w-3" : "h-5 w-5";
  const box = size === "sm" ? "h-6 w-6 rounded" : "h-8 w-8 rounded-lg";
  const text = size === "sm" ? "text-base" : "text-xl";

  return (
    <Link href="/" className="flex items-center gap-2">
      <div
        className={cn(
          box,
          "bg-primary flex items-center justify-center shadow-sm shadow-primary/25",
        )}
      >
        <Zap className={cn(icon, "text-primary-foreground")} />
      </div>
      <span className={cn(text, "font-bold tracking-tight")}>
        Track<span className="text-primary">Ezz</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-8 rounded-md border border-border" />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

function scrollToSection(href: string) {
  const id = href.replace("#", "");
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ProductPreview() {
  const [tab, setTab] = useState<PreviewTab>("board");

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-3xl opacity-40" />
      <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="ml-4 flex gap-1 rounded-lg bg-background/60 p-0.5">
            {(
              [
                { id: "board" as const, label: "Board", icon: SquareKanban },
                { id: "issues" as const, label: "Issues", icon: ListTodo },
                { id: "sprints" as const, label: "Sprints", icon: Target },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors",
                  tab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 min-h-[280px] bg-background/50">
          {tab === "board" && (
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Todo",
                  color: "#a1a1aa",
                  items: ["Auth flow", "API docs"],
                },
                {
                  label: "In Progress",
                  color: "#6366f1",
                  items: ["Board drag-drop"],
                },
                { label: "Done", color: "#22c55e", items: ["Issue comments"] },
              ].map((col) => (
                <div
                  key={col.label}
                  className="rounded-lg border bg-muted/20 p-2"
                  style={{ borderColor: `${col.color}40` }}
                >
                  <div className="mb-2 flex items-center gap-1.5 px-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="text-[10px] font-semibold text-foreground">
                      {col.label}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {col.items.map((item) => (
                      <div
                        key={item}
                        className="rounded-md border border-border bg-card px-2 py-1.5 text-[10px] font-medium text-foreground shadow-sm"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "issues" && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[80px_1fr_80px_72px] gap-2 border-b border-border bg-muted/30 px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Key</span>
                <span>Title</span>
                <span>Status</span>
                <span>Priority</span>
              </div>
              {[
                {
                  key: "TE-12",
                  title: "Rich text editor in comments",
                  status: "Done",
                  p: "Medium",
                },
                {
                  key: "TE-13",
                  title: "Custom workflow statuses",
                  status: "In Progress",
                  p: "High",
                },
                {
                  key: "TE-14",
                  title: "Sprint velocity chart",
                  status: "Todo",
                  p: "Low",
                },
              ].map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[80px_1fr_80px_72px] gap-2 border-b border-border/50 px-3 py-2 text-[10px] last:border-0 hover:bg-accent/30"
                >
                  <span className="font-mono text-muted-foreground">
                    {row.key}
                  </span>
                  <span className="font-medium text-foreground truncate">
                    {row.title}
                  </span>
                  <span className="text-muted-foreground">{row.status}</span>
                  <span className="text-muted-foreground">{row.p}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "sprints" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">
                    Sprint 4
                  </span>
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-medium text-primary">
                    Active
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Ship onboarding and board improvements
                </p>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-primary" />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 opacity-70">
                <span className="text-xs font-semibold text-foreground">
                  Sprint 5
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Planned · starts next week
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {a}
        </p>
      )}
    </div>
  );
}

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSignedIn, isLoading } = useIsSignedIn();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 z-10 w-full border-b border-border bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Logo />

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => scrollToSection(link.href)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {isLoading ? (
              <NavAuthSkeleton />
            ) : isSignedIn ? (
              <DashboardLink className="hidden sm:block">
                <Button size="sm" className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </DashboardLink>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
                >
                  <Button size="sm" variant="secondary">
                    Sign in
                  </Button>
                </Link>
                <Link href="/register" className="hidden sm:block">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-background px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => {
                    scrollToSection(link.href);
                    setMobileOpen(false);
                  }}
                  className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {link.label}
                </button>
              ))}
              {isLoading ? (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              ) : isSignedIn ? (
                <DashboardLink onNavigate={() => setMobileOpen(false)}>
                  <Button size="sm" className="mt-2 w-full gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </DashboardLink>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="mt-2 w-full">
                      Get started free
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-16 md:pb-24 md:pt-24">
          <div className="pointer-events-none absolute inset-0 landing-grid opacity-40" />
          <div className="relative mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary animate-fade-in">
                <Command className="h-3 w-3" />
                <span>Project management built for shipping teams</span>
              </div>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl animate-fade-in">
                Plan sprints. Track issues.{" "}
                <span className="gradient-text">Ship faster.</span>
              </h1>
              <p
                className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in"
                style={{ animationDelay: "0.1s" }}
              >
                TrackEzz brings issues, kanban boards, sprints, bug tracking,
                and team collaboration into one fast workspace — without the
                Jira overhead.
              </p>
              <div
                className="flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-in"
                style={{ animationDelay: "0.2s" }}
              >
                {isLoading ? (
                  <HeroCtaSkeleton />
                ) : isSignedIn ? (
                  <GoToDashboardButton
                    size="lg"
                    className="h-12 px-8 text-base w-full sm:w-auto gap-2"
                    showIcon
                  />
                ) : (
                  <>
                    <Link href="/register">
                      <Button
                        size="lg"
                        className="h-12 px-8 text-base w-full sm:w-auto"
                      >
                        Start free <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-12 px-8 text-base w-full sm:w-auto"
                      >
                        Sign in to workspace
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                {[
                  { icon: SquareKanban, label: "Kanban boards" },
                  { icon: GitBranch, label: "Custom workflows" },
                  { icon: MessageSquare, label: "Rich comments" },
                  { icon: BarChart2, label: "Analytics" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="mt-16 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="scroll-mt-20 border-t border-border bg-muted/20 py-20 px-4"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 text-center">
              <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
                Everything your team needs to deliver
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                From backlog grooming to release day — real features that ship
                in TrackEzz today.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product highlights */}
        <section id="product" className="scroll-mt-20 py-20 px-4">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                  Built for how software teams actually work
                </h2>
                <p className="mb-8 text-muted-foreground leading-relaxed">
                  Keyboard-friendly navigation, a command palette, inbox
                  notifications, and project switcher — so you spend less time
                  clicking and more time shipping.
                </p>
                <ul className="space-y-3">
                  {[
                    "Command palette (Ctrl+K) for instant navigation",
                    "Issue detail with rich text, attachments & shareable comment links",
                    "My Tasks, Inbox, and Analytics dashboards",
                    "Google sign-in when enabled by your workspace",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: Inbox,
                    label: "Inbox",
                    desc: "Stay on top of updates",
                  },
                  {
                    icon: Layers,
                    label: "Backlog",
                    desc: "Prioritize what's next",
                  },
                  {
                    icon: BarChart2,
                    label: "Analytics",
                    desc: "Track team velocity",
                  },
                  { icon: Users, label: "Members", desc: "Roles & invites" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                  >
                    <Icon className="mb-2 h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-20 grid gap-6 md:grid-cols-3">
              {WORKFLOW_STEPS.map((step) => (
                <div
                  key={step.step}
                  className="relative rounded-2xl border border-border bg-card p-6"
                >
                  <span className="text-4xl font-black text-primary/20">
                    {step.step}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="scroll-mt-20 border-t border-border bg-muted/20 py-20 px-4"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
                Simple pricing, no surprises
              </h2>
              <p className="text-muted-foreground">
                Start free during early access. Upgrade paths coming later.
              </p>
            </div>
            <div className="mx-auto max-w-md">
              <div className="rounded-2xl border-2 border-primary/40 bg-card p-8 shadow-xl shadow-primary/10">
                <div className="mb-6">
                  <p className="text-sm font-medium text-primary">
                    Early access
                  </p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold">$0</span>
                    <span className="text-muted-foreground">/ month</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    For individuals and teams getting started
                  </p>
                </div>
                <ul className="mb-8 space-y-3">
                  {PRICING_FEATURES.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isLoading ? (
                  <CtaButtonSkeleton className="h-11" />
                ) : isSignedIn ? (
                  <DashboardLink className="block">
                    <Button size="lg" className="w-full">
                      Go to Dashboard
                    </Button>
                  </DashboardLink>
                ) : (
                  <Link href="/register" className="block">
                    <Button size="lg" className="w-full">
                      Create free account
                    </Button>
                  </Link>
                )}
                {isLoading ? (
                  <CtaSubtextSkeleton />
                ) : (
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    {isSignedIn ? (
                      <>
                        You&apos;re on the early access plan — all features
                        included.
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <Link
                          href="/login"
                          className="text-primary hover:underline"
                        >
                          Sign in
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 py-20 px-4">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
            <div className="rounded-2xl border border-border bg-card px-6">
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20">
          <div className="mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground md:px-12">
              <div className="relative z-10">
                <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                  Ready to ship better software?
                </h2>
                <p className="mx-auto mb-8 max-w-lg text-primary-foreground/80">
                  Create your workspace in minutes. Invite your team and start
                  tracking work the modern way.
                </p>
                {isLoading ? (
                  <CtaButtonSkeleton className="mx-auto h-12 w-44" />
                ) : isSignedIn ? (
                  <DashboardLink>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="h-12 px-10"
                    >
                      Go to Dashboard
                    </Button>
                  </DashboardLink>
                ) : (
                  <Link href="/register">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="h-12 px-10"
                    >
                      Get started free
                    </Button>
                  </Link>
                )}
              </div>
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <Logo size="sm" />
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => router.push("/privacy-policy")}
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => router.push("/terms-of-service")}
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => router.push("/contact-us")}
              className="hover:text-foreground transition-colors"
            >
              Contact Us
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TrackEzz
          </p>
        </div>
      </footer>
    </div>
  );
}
