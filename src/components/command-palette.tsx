"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Folder,
  Settings,
  Plus,
  LayoutDashboard,
  Inbox,
  Sparkles,
  Wand2,
  MessageSquare,
} from "lucide-react";
import { IssueTypeIcon, StatusIcon } from "@/components/ui/issue-badges";
import {
  assistantPath,
  projectKeyForId,
  projectPath,
  issuePath,
} from "@/lib/projects/route";
import { pushWithDashboardRouteTransition } from "@/lib/navigation/dashboard-navigation";

type PaletteAction = {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  shortcut?: string | null;
  href?: string | null;
  action?: "new-issue";
  keywords?: string[];
};

const ACTIONS: PaletteAction[] = [
  {
    id: "new-issue",
    label: "Create new issue",
    icon: <Plus className="h-4 w-4 text-primary" />,
    shortcut: null,
    href: null,
    action: "new-issue",
  },
  {
    id: "dashboard",
    label: "Go to Dashboard",
    icon: <LayoutDashboard className="h-4 w-4 text-muted-foreground" />,
    shortcut: null,
    href: "/dashboard",
  },
  {
    id: "inbox",
    label: "Go to Inbox",
    icon: <Inbox className="h-4 w-4 text-muted-foreground" />,
    shortcut: null,
    href: "/dashboard/inbox",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4 text-muted-foreground" />,
    shortcut: null,
    href: "/dashboard/settings",
  },
];

const AI_HINTS = [
  "What's blocking our current sprint?",
  "Summarize open bugs",
  "Which issues are overdue?",
];

function matchesQuery(
  q: string,
  parts: Array<string | undefined | null>,
  keywords: string[] = [],
) {
  if (!q) return true;
  const haystack = [...parts, ...keywords]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function CommandPalette() {
  const {
    commandPaletteOpen,
    closeCommandPalette,
    openNewIssue,
    searchQuery,
    setSearchQuery,
    currentProject,
  } = useAppStore();
  const { issues, projects } = useDataStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const aiActions = useMemo<PaletteAction[]>(() => {
    const actions: PaletteAction[] = [];

    if (currentProject.id) {
      actions.push({
        id: "assistant",
        label: "Open project assistant",
        sub: `Ask AI about ${currentProject.name}`,
        icon: <Sparkles className="h-4 w-4 text-violet-500" />,
        href: assistantPath(currentProject.key),
        keywords: ["ai", "assistant", "chat", "copilot", "ask", "help", "bot"],
      });
    }

    return actions;
  }, [currentProject.id, currentProject.key, currentProject.name]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [commandPaletteOpen, setSearchQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useAppStore.getState().toggleCommandPalette();
      }
      if (e.key === "Escape" && commandPaletteOpen) closeCommandPalette();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, closeCommandPalette]);

  if (!commandPaletteOpen) return null;

  const q = searchQuery.toLowerCase();
  const filteredIssues =
    q.length > 0
      ? issues
          .filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.issueKey.toLowerCase().includes(q),
          )
          .slice(0, 5)
      : issues.slice(0, 4);
  const filteredProjects =
    q.length > 0
      ? projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 3)
      : projects.slice(0, 3);
  const filteredActions = ACTIONS.filter((a) =>
    matchesQuery(q, [a.label], a.keywords),
  );
  const hasNonAiResults =
    filteredIssues.length > 0 ||
    filteredProjects.length > 0 ||
    filteredActions.length > 0;
  const showNoResults = q.length > 0 && !hasNonAiResults;
  const showAiHints = q.length === 0 && currentProject.id;

  const handleSelect = (item: PaletteAction) => {
    closeCommandPalette();
    if (item.action === "new-issue") {
      openNewIssue();
      return;
    }
    if (item.href) pushWithDashboardRouteTransition(router, item.href);
  };

  return (
    <div className="fixed inset-0 z-10000 flex items-start justify-center p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-24">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeCommandPalette}
      />

      {/* Panel */}
      <div className="relative flex h-[min(86dvh,720px)] w-full max-w-2xl animate-scale-in sm:h-auto">
        <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:rounded-xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues, projects, actions, or AI…"
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:max-h-[420px]">
            {/* AI — always visible */}
            {aiActions.length > 0 && (
              <Group label="AI">
                {aiActions.map((action) => (
                  <ResultItem
                    key={action.id}
                    icon={action.icon}
                    label={action.label}
                    sub={action.sub}
                    shortcut={action.shortcut}
                    onClick={() => handleSelect(action)}
                  />
                ))}
                {showAiHints && (
                  <div className="mx-2 mt-1 mb-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                      Try asking the assistant
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {AI_HINTS.map((hint) => (
                        <li
                          key={hint}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          <MessageSquare className="h-3 w-3 shrink-0 text-violet-500/70" />
                          <span className="truncate">&ldquo;{hint}&rdquo;</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Group>
            )}

            {/* Actions */}
            {filteredActions.length > 0 && (
              <Group label="Actions">
                {filteredActions.map((action) => (
                  <ResultItem
                    key={action.id}
                    icon={action.icon}
                    label={action.label}
                    shortcut={action.shortcut}
                    onClick={() => handleSelect(action)}
                  />
                ))}
              </Group>
            )}

            {/* Projects */}
            {filteredProjects.length > 0 && (
              <Group label="Projects">
                {filteredProjects.map((p) => (
                  <ResultItem
                    key={p.id}
                    icon={
                      <Folder className="h-4 w-4" style={{ color: p.color }} />
                    }
                    label={p.name}
                    sub={`${p.issueCount} issues`}
                    onClick={() => {
                      closeCommandPalette();
                      pushWithDashboardRouteTransition(
                        router,
                        projectPath(p.key),
                      );
                    }}
                  />
                ))}
              </Group>
            )}

            {/* Issues */}
            {filteredIssues.length > 0 && (
              <Group label="Issues">
                {filteredIssues.map((issue) => (
                  <ResultItem
                    key={issue.id}
                    icon={<IssueTypeIcon type={issue.type} />}
                    label={issue.title}
                    sub={issue.issueKey}
                    rightIcon={<StatusIcon status={issue.status} />}
                    onClick={() => {
                      closeCommandPalette();
                      pushWithDashboardRouteTransition(
                        router,
                        issuePath(
                          projectKeyForId(projects, issue.projectId),
                          issue.id,
                        ),
                      );
                    }}
                  />
                ))}
              </Group>
            )}

            {showNoResults && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No results for &quot;{searchQuery}&quot;
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultItem({
  icon,
  label,
  sub,
  shortcut,
  rightIcon,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string | null;
  shortcut?: string | null;
  rightIcon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent sm:min-h-0 sm:rounded-lg sm:px-2"
    >
      <span className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-muted">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block truncate font-medium text-foreground">
          {label}
        </span>
        {sub && (
          <span className="block text-xs text-muted-foreground">{sub}</span>
        )}
      </span>
      {shortcut && (
        <kbd className="shrink-0 hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          {shortcut}
        </kbd>
      )}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
    </button>
  );
}
