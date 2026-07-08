"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  MessageSquare,
  FolderPlus,
} from "lucide-react";
import { IssueTypeIcon, StatusIcon } from "@/components/ui/issue-badges";
import {
  assistantPath,
  projectKeyForId,
  projectPath,
  issuePath,
} from "@/lib/projects/route";
import { pushWithDashboardRouteTransition } from "@/lib/navigation/dashboard-navigation";
import { cn } from "@/lib/utils";

type PaletteAction = {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  shortcut?: string | null;
  href?: string | null;
  action?: "new-issue" | "new-project";
  keywords?: string[];
};

type SelectableEntry = {
  id: string;
  group: string;
  icon: React.ReactNode;
  label: string;
  sub?: string | null;
  shortcut?: string | null;
  rightIcon?: React.ReactNode;
  onSelect: () => void;
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
    id: "new-project",
    label: "Create new project",
    icon: <FolderPlus className="h-4 w-4 text-primary" />,
    shortcut: null,
    href: null,
    action: "new-project",
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
    openNewProject,
    searchQuery,
    setSearchQuery,
    currentProject,
  } = useAppStore();
  const { issues, projects } = useDataStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  const q = searchQuery.toLowerCase();

  const filteredIssues = useMemo(
    () =>
      q.length > 0
        ? issues
            .filter(
              (i) =>
                i.title.toLowerCase().includes(q) ||
                i.issueKey.toLowerCase().includes(q),
            )
            .slice(0, 5)
        : issues.slice(0, 4),
    [issues, q],
  );

  const filteredProjects = useMemo(
    () =>
      q.length > 0
        ? projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 3)
        : projects.slice(0, 3),
    [projects, q],
  );

  const filteredActions = useMemo(
    () =>
      ACTIONS.filter((action) => {
        if (action.action === "new-issue" && projects.length === 0) {
          return false;
        }
        return matchesQuery(q, [action.label], action.keywords);
      }),
    [projects.length, q],
  );

  const handleSelectAction = useCallback(
    (item: PaletteAction) => {
      closeCommandPalette();
      if (item.action === "new-issue") {
        openNewIssue();
        return;
      }
      if (item.action === "new-project") {
        openNewProject();
        return;
      }
      if (item.href) pushWithDashboardRouteTransition(router, item.href);
    },
    [closeCommandPalette, openNewIssue, openNewProject, router],
  );

  const selectableEntries = useMemo<SelectableEntry[]>(() => {
    const entries: SelectableEntry[] = [];

    for (const action of aiActions) {
      entries.push({
        id: action.id,
        group: "AI",
        icon: action.icon,
        label: action.label,
        sub: action.sub,
        shortcut: action.shortcut,
        onSelect: () => handleSelectAction(action),
      });
    }

    for (const action of filteredActions) {
      entries.push({
        id: action.id,
        group: "Actions",
        icon: action.icon,
        label: action.label,
        shortcut: action.shortcut,
        onSelect: () => handleSelectAction(action),
      });
    }

    for (const project of filteredProjects) {
      entries.push({
        id: project.id,
        group: "Projects",
        icon: <Folder className="h-4 w-4" style={{ color: project.color }} />,
        label: project.name,
        sub: `${project.issueCount} issues`,
        onSelect: () => {
          closeCommandPalette();
          pushWithDashboardRouteTransition(router, projectPath(project.key));
        },
      });
    }

    for (const issue of filteredIssues) {
      entries.push({
        id: issue.id,
        group: "Issues",
        icon: <IssueTypeIcon type={issue.type} />,
        label: issue.title,
        sub: issue.issueKey,
        rightIcon: <StatusIcon status={issue.status} />,
        onSelect: () => {
          closeCommandPalette();
          pushWithDashboardRouteTransition(
            router,
            issuePath(projectKeyForId(projects, issue.projectId), issue.id),
          );
        },
      });
    }

    return entries;
  }, [
    aiActions,
    closeCommandPalette,
    filteredActions,
    filteredIssues,
    filteredProjects,
    handleSelectAction,
    projects,
    router,
  ]);

  const hasNonAiResults =
    filteredIssues.length > 0 ||
    filteredProjects.length > 0 ||
    filteredActions.length > 0;
  const showNoResults = q.length > 0 && !hasNonAiResults;
  const showAiHints = q.length === 0 && currentProject.id;

  useEffect(() => {
    if (commandPaletteOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen, setSearchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedIndex >= selectableEntries.length) {
      setSelectedIndex(Math.max(0, selectableEntries.length - 1));
    }
  }, [selectableEntries.length, selectedIndex]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, selectableEntries]);

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

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (selectableEntries.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((index) =>
        Math.min(index + 1, selectableEntries.length - 1),
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      selectableEntries[selectedIndex]?.onSelect();
    }
  };

  if (!commandPaletteOpen) return null;

  let entryIndex = -1;

  return (
    <div className="fixed inset-0 z-10000 flex items-start justify-center p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-24">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeCommandPalette}
      />

      <div className="relative flex h-[min(86dvh,720px)] w-full max-w-2xl animate-scale-in sm:h-auto">
        <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:rounded-xl">
          <div className="flex shrink-0 items-center gap-3 border-b border-border p-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search issues, projects, actions, or AI…"
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:max-h-[420px]">
            {selectableEntries.length > 0 && (
              <>
                {(["AI", "Actions", "Projects", "Issues"] as const).map(
                  (group) => {
                    const groupEntries = selectableEntries.filter(
                      (entry) => entry.group === group,
                    );
                    if (groupEntries.length === 0) return null;

                    return (
                      <Group key={group} label={group}>
                        {groupEntries.map((entry) => {
                          entryIndex += 1;
                          const index = entryIndex;

                          return (
                            <ResultItem
                              key={entry.id}
                              ref={(el) => {
                                itemRefs.current[index] = el;
                              }}
                              icon={entry.icon}
                              label={entry.label}
                              sub={entry.sub}
                              shortcut={entry.shortcut}
                              rightIcon={entry.rightIcon}
                              active={index === selectedIndex}
                              onMouseEnter={() => setSelectedIndex(index)}
                              onClick={entry.onSelect}
                            />
                          );
                        })}
                        {group === "AI" && showAiHints && (
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
                                  <span className="truncate">
                                    &ldquo;{hint}&rdquo;
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </Group>
                    );
                  },
                )}
              </>
            )}

            {showNoResults && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results for &quot;{searchQuery}&quot;
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-card/95 px-4 py-2.5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <ShortcutHint keys={["↑", "↓"]} label="Navigate" />
              <ShortcutHint keys={["↵"]} label="Select" />
              <ShortcutHint keys={["Esc"]} label="Close" />
            </div>
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

function ShortcutHint({
  keys,
  label,
}: {
  keys: string[];
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px]"
          >
            {key}
          </kbd>
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}

const ResultItem = forwardRef<
  HTMLButtonElement,
  {
    icon: React.ReactNode;
    label: string;
    sub?: string | null;
    shortcut?: string | null;
    rightIcon?: React.ReactNode;
    active?: boolean;
    onMouseEnter?: () => void;
    onClick: () => void;
  }
>(function ResultItem(
  {
    icon,
    label,
    sub,
    shortcut,
    rightIcon,
    active,
    onMouseEnter,
    onClick,
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors sm:min-h-0 sm:rounded-lg sm:px-2",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent",
      )}
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
});
