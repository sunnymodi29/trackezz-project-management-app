"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  GitBranch,
  Check,
  ChevronDown,
  Menu,
  X,
  Layers,
  Inbox,
  LayoutDashboard,
  Sparkles,
  Bot,
  Wand2,
  Search,
  FileText,
} from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { PricingSection } from "@/components/landing/pricing-section";
import { MARKETING_FOOTER_LINKS } from "@/components/landing/marketing-footer-links";

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
  { href: "#ai", label: "AI", highlight: true },
  { href: "#features", label: "Features" },
  { href: "#product", label: "Product" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const AI_CAPABILITIES = [
  {
    icon: Bot,
    title: "Project assistant",
    description:
      "Chat with an AI that knows your backlog, members, sprints, and workflow. Ask what's blocked, get summaries, and confirm status changes inline.",
    tag: "Grounded in your data",
  },
  {
    icon: Wand2,
    title: "Smart triage",
    description:
      "Creating an issue? AI suggests type, workflow status, and priority from your title and description — tuned to your project's statuses.",
    tag: "One-click apply",
  },
  {
    icon: Search,
    title: "Duplicate detection",
    description:
      "Surface similar issues while you type so you avoid filing duplicates and can link related work before it spreads.",
    tag: "As you type",
  },
  {
    icon: FileText,
    title: "Comment intelligence",
    description:
      "Summarize long discussion threads or draft a reply from context — so standups and handoffs take minutes, not hours.",
    tag: "On every issue",
  },
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

const FAQ_ITEMS = [
  {
    q: "What can the AI assistant do?",
    a: "The project assistant answers questions grounded in your real backlog — issues, members, sprints, labels, and workflow statuses. It can propose status changes you confirm before anything updates. Separate AI tools also triage new issues, find similar duplicates, and summarize or draft comment replies.",
  },
  {
    q: "Is TrackEzz free to use?",
    a: "Yes. The Free plan includes unlimited projects, up to 10 members, 50 AI messages per month, basic analytics, and 100 MB storage — with no time limit. Pro pricing and trial details are shown above from Paddle for unlimited members, AI, full analytics, and 10 GB storage.",
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

type PreviewTab = "assistant" | "board" | "issues" | "sprints";

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

function scrollToSection(href: string) {
  const id = href.replace("#", "");
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ProductPreview() {
  const [tab, setTab] = useState<PreviewTab>("assistant");

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-4 rounded-3xl bg-primary/25 blur-3xl opacity-50" />
      <div className="relative rounded-2xl border border-primary/20 bg-card shadow-2xl shadow-primary/10 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="ml-4 flex gap-1 rounded-lg bg-background/60 p-0.5 overflow-x-auto">
            {(
              [
                {
                  id: "assistant" as const,
                  label: "AI Assistant",
                  icon: Sparkles,
                },
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
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors whitespace-nowrap",
                  tab === id
                    ? id === "assistant"
                      ? "bg-gradient-to-r from-violet-600 to-primary text-primary-foreground shadow-sm"
                      : "bg-primary text-primary-foreground"
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
          {tab === "assistant" && <AssistantPreviewPanel />}

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

function AssistantPreviewPanel() {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
      <div className="space-y-3 rounded-lg border border-border bg-card/80 p-3">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[10px] text-primary-foreground">
            What&apos;s blocking Sprint 4? Any bugs still open?
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-primary">
            <Bot className="h-3 w-3 text-white" />
          </div>
          <div className="min-w-0 flex-1 space-y-2 rounded-2xl rounded-tl-md border border-border bg-muted/30 px-3 py-2 text-[10px] leading-relaxed text-foreground">
            <p>
              Sprint 4 has <strong>2 open bugs</strong> and{" "}
              <strong>1 in-progress</strong> task:
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              <li>
                <span className="font-mono text-foreground">TE-42</span> — Login
                timeout on mobile
              </li>
              <li>
                <span className="font-mono text-foreground">TE-38</span> — API
                rate limit errors
              </li>
            </ul>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
              <p className="text-[9px] font-medium text-primary">
                Proposed status change
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Move <span className="font-mono text-foreground">TE-38</span> →{" "}
                <span className="text-foreground">In Progress</span>
              </p>
              <div className="mt-2 flex gap-1.5">
                <span className="rounded bg-primary px-2 py-0.5 text-[9px] font-medium text-primary-foreground">
                  Confirm
                </span>
                <span className="rounded border border-border px-2 py-0.5 text-[9px] text-muted-foreground">
                  Dismiss
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold text-violet-600 dark:text-violet-300">
            <Wand2 className="h-3 w-3" />
            Smart triage
          </div>
          <p className="text-[9px] text-muted-foreground">
            Suggested: <span className="text-foreground">Bug</span> · High ·
            Todo
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold text-foreground">
            <Search className="h-3 w-3 text-primary" />
            Similar issues
          </div>
          <p className="font-mono text-[9px] text-muted-foreground">
            TE-12 · 89% match
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold text-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Thread summary
          </div>
          <p className="text-[9px] text-muted-foreground line-clamp-3">
            Team agreed on retry logic; QA blocked pending staging deploy.
          </p>
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 z-50 w-full border-b border-border bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Logo />

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => scrollToSection(link.href)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  "highlight" in link && link.highlight
                    ? "inline-flex items-center gap-1.5 text-primary"
                    : "text-muted-foreground",
                )}
              >
                {"highlight" in link && link.highlight ? (
                  <Sparkles className="h-3.5 w-3.5" />
                ) : null}
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle size="sm" />
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
          <div className="border-border bg-background/10 backdrop-blur-2xl px-4 py-4 md:hidden">
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
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2 w-full"
                    >
                      Sign in
                    </Button>
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
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-gradient-to-r from-violet-500/15 to-primary/15 px-3 py-1 text-xs font-semibold text-primary animate-fade-in">
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  Project management - Now with AI built into every project
                </span>
              </div>
              <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl animate-fade-in">
                Plan sprints. Track issues.{" "}
                <span className="gradient-text">
                  Ship faster with an AI copilot.
                </span>
              </h1>
              <p
                className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in"
                style={{ animationDelay: "0.1s" }}
              >
                TrackEzz combines issues, kanban, and sprints with a project
                assistant that knows your real data — plus smart triage,
                duplicate detection, and comment AI so your team ships faster.
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
                  { icon: Bot, label: "Project assistant" },
                  { icon: Wand2, label: "Smart triage" },
                  { icon: SquareKanban, label: "Kanban boards" },
                  { icon: GitBranch, label: "Custom workflows" },
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

        {/* AI — standout section */}
        <section
          id="ai"
          className="scroll-mt-20 relative overflow-hidden border-y border-primary/20 px-4 py-20 md:py-28"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/10 via-primary/5 to-background" />
          <div className="pointer-events-none absolute -left-32 top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative mx-auto max-w-7xl">
            <div className="mb-12 text-center md:mb-16">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                AI that works inside your workflow
              </div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
                Ask your project anything.{" "}
                <span className="gradient-text">
                  Get answers you can act on.
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground md:text-lg">
                Not a generic chatbot — TrackEzz AI is grounded in your issues,
                workflow, and team context. Propose changes, triage faster, and
                keep discussions moving without leaving the app.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AI_CAPABILITIES.map(
                ({ icon: Icon, title, description, tag }) => (
                  <div
                    key={title}
                    className="group relative rounded-2xl border border-border/80 bg-card/80 p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="mb-3 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {tag}
                    </span>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/20 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </div>
                ),
              )}
            </div>

            <div className="mt-12 rounded-2xl border border-primary/20 bg-card/60 p-6 md:p-8 backdrop-blur-sm">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <h3 className="text-xl font-bold md:text-2xl">
                    Grounded answers, human control
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    The assistant cites real issue keys from your catalog and
                    only changes workflow status after you confirm. Triage and
                    similar-issue suggestions respect your project&apos;s custom
                    statuses — no hallucinated fields or invented tickets.
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      "Chat history per project with shareable links",
                      "Inline status proposals you approve before save",
                      "Similar issues while composing new tickets",
                      "Summarize threads or draft replies in one click",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <AssistantPreviewPanel />
              </div>
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
                AI-powered productivity plus the project management essentials —
                kanban, sprints, bugs, and collaboration in one workspace.
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
                    "AI project assistant with grounded project context",
                    "Command palette (Ctrl+K) for instant navigation",
                    "Issue detail with rich text, attachments & shareable comment links",
                    "My Tasks, Inbox, and Analytics dashboards",
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
                    icon: Bot,
                    label: "Assistant",
                    desc: "Chat with your backlog",
                  },
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
        <PricingSection />

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
                  Ready to ship with AI on your side?
                </h2>
                <p className="mx-auto mb-8 max-w-lg text-primary-foreground/80">
                  Create your workspace in minutes. Open the project assistant,
                  triage your first issue, and see how much faster your team can
                  move.
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
          <nav
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            aria-label="Legal and support"
          >
            {MARKETING_FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TrackEzz
          </p>
        </div>
      </footer>
    </div>
  );
}
