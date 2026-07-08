"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox as InboxIcon,
  CheckCheck,
  MessageSquare,
  UserPlus,
  Target,
  Bell,
  Trash2,
  Mail,
} from "lucide-react";
import { Avatar, Button, Tooltip, Skeleton } from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";
import { projectKeyForId, issuePath } from "@/lib/projects/route";
import { pushWithDashboardRouteTransition } from "@/lib/navigation/dashboard-navigation";
import { useDataStore } from "@/store/data-store";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/lib/actions/notifications";
import type { Notification } from "@/types";
import { cn } from "@/lib/utils";

type InboxFilter = "all" | "unread";

export function InboxView() {
  const router = useRouter();
  const {
    hydrated,
    notifications,
    projects,
    patchNotification,
    markAllNotificationsRead: markAllLocal,
    removeNotification,
  } = useDataStore();

  const [filter, setFilter] = useState<InboxFilter>("all");
  const [acting, setActing] = useState(false);

  const filtered = useMemo(() => {
    const list = [...notifications].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    if (filter === "unread") return list.filter((n) => !n.read);
    return list;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    setActing(true);
    try {
      await markAllNotificationsRead();
      markAllLocal();
      router.refresh();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Inbox
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Assignments, comments, invitations, and updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <div className="flex rounded-lg border border-border p-1">
              <FilterTab
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </FilterTab>
              <FilterTab
                active={filter === "unread"}
                onClick={() => setFilter("unread")}
              >
                Unread
              </FilterTab>
            </div>
          )}
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={acting}
              onClick={() => void handleMarkAllRead()}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {!hydrated &&
          Array.from({ length: 5 }).map((_, i) => (
            <InboxItemSkeleton key={i} />
          ))}
        {hydrated && filtered.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <InboxIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">
              {filter === "unread"
                ? "No unread notifications"
                : "Your inbox is empty"}
            </p>
            <p className="text-sm mt-1">
              {filter === "unread"
                ? "Switch to All to see read items."
                : "New activity will appear here."}
            </p>
          </div>
        )}

        {hydrated &&
          filtered.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              projects={projects}
              onRead={(updated) => {
                patchNotification(updated.id, { read: updated.read });
              }}
              onRemove={() => removeNotification(notification.id)}
            />
          ))}
      </div>
    </div>
  );
}

function InboxItemSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex gap-3">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors sm:min-h-0",
        active
          ? "bg-accent text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function NotificationItem({
  notification,
  projects,
  onRead,
  onRemove,
}: {
  notification: Notification;
  projects: import("@/types").Project[];
  onRead: (n: Notification) => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const Icon =
    {
      mention: MessageSquare,
      assign: UserPlus,
      comment: MessageSquare,
      status_change: Target,
      sprint: Target,
      invitation: Mail,
    }[notification.type] || Bell;

  const href = (() => {
    if (notification.type === "invitation" && notification.invitation?.token) {
      return `/invite/${notification.invitation.token}`;
    }
    if (notification.issue) {
      return issuePath(
        projectKeyForId(projects, notification.issue.projectId),
        notification.issue.id,
      );
    }
    return null;
  })();

  const handleOpen = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!notification.read) {
        const updated = await markNotificationRead(notification.id);
        onRead(updated);
      }
      if (href) {
        if (href.startsWith("/dashboard")) {
          pushWithDashboardRouteTransition(router, href);
        } else {
          router.push(href);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      await deleteNotification(notification.id);
      onRemove();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role={href ? "button" : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={() => void handleOpen()}
      onKeyDown={(e) => {
        if (href && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          void handleOpen();
        }
      }}
      className={cn(
        "group relative flex items-start gap-4 p-4 rounded-2xl border transition-all",
        href && "cursor-pointer hover:shadow-md hover:border-primary/30",
        notification.read
          ? "bg-card border-border"
          : "bg-primary/3 border-primary/20 ring-1 ring-primary/5",
      )}
    >
      {!notification.read && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      <div className="relative shrink-0 ml-2">
        <Avatar
          src={notification.actor.avatarUrl}
          name={notification.actor.name}
          size="md"
        />
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border-2 border-background flex items-center justify-center text-primary">
          <Icon className="h-3 w-3" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="text-sm min-w-0">
            <span className="font-bold text-foreground">
              {notification.actor.name}
            </span>
            <span className="text-muted-foreground">
              {" "}
              {notification.message}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 group-hover:opacity-0 transition-opacity">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>

        <div className="text-xs font-semibold text-primary/90 mb-2">
          {notification.title}
        </div>

        {notification.issue && (
          <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-muted/50 text-[11px] font-medium text-muted-foreground border border-border/50">
            <span className="font-mono text-primary/70">
              {notification.issue.issueKey}
            </span>
            <span className="truncate max-w-[240px]">
              {notification.issue.title}
            </span>
          </div>
        )}

        {notification.type === "invitation" && notification.invitation && (
          <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-primary/10 text-[11px] font-medium text-primary border border-primary/20">
            {notification.invitation.status === "pending"
              ? "View invitation →"
              : `Invitation ${notification.invitation.status}`}
          </div>
        )}
      </div>
      <Tooltip content="Dismiss" side="left">
        <button
          type="button"
          onClick={(e) => void handleDelete(e)}
          disabled={busy}
          className="absolute top-4 right-4 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity"
          aria-label="Dismiss notification"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </Tooltip>
    </div>
  );
}
