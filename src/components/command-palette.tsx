"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Hash,
  Folder,
  Zap,
  Settings,
  Plus,
  LayoutDashboard,
  Inbox,
} from "lucide-react";
import { IssueTypeIcon, StatusIcon } from "@/components/ui/issue-badges";
import { cn } from "@/lib/utils";
import { projectKeyForId, projectPath, issuePath } from "@/lib/projects/route";

const ACTIONS = [
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

export function CommandPalette() {
  const {
    commandPaletteOpen,
    closeCommandPalette,
    openNewIssue,
    searchQuery,
    setSearchQuery,
  } = useAppStore();
  const { issues, projects } = useDataStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

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
  const filteredActions = ACTIONS.filter(
    (a) => q.length === 0 || a.label.toLowerCase().includes(q),
  );

  const handleSelect = (item: (typeof ACTIONS)[0]) => {
    closeCommandPalette();
    if (item.action === "new-issue") {
      openNewIssue();
      return;
    }
    if (item.href) router.push(item.href);
  };

  return (
    <div className="fixed inset-0 z-10000 flex items-start justify-center pt-24">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeCommandPalette}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl animate-scale-in">
        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues, projects, actions..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[420px] overflow-y-auto p-2">
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
                      router.push(projectPath(p.key));
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
                      router.push(
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

            {q.length > 0 &&
              filteredIssues.length === 0 &&
              filteredProjects.length === 0 &&
              filteredActions.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No results for &quot;{q}&quot;
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
      className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-accent transition-colors text-left"
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
