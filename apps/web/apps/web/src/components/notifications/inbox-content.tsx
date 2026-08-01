"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Inbox } from "lucide-react";
import {
  Button,
  EmptyState,
  Kbd,
  Skeleton,
  cn,
} from "@elliptic/ui";
import { useShortcut } from "@/lib/keyboard";
import { ErrorState } from "@/components/error-state";
import {
  useArchiveNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useSnoozeNotification,
  type Notification,
  type NotificationStatus,
} from "@/hooks/use-notification-queries";
import { NotificationRow } from "./notification-row";
import { entityHref } from "./notification-meta";

const SNOOZE_MS = 60 * 60 * 1000;

function snoozeUntil(): string {
  return new Date(Date.now() + SNOOZE_MS).toISOString();
}

export interface InboxContentProps {
  orgId: string;
  active: boolean;
  status?: NotificationStatus;
  onNavigate?: () => void;
  className?: string;
  compact?: boolean;
}

function InboxTab({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-caption font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        selected ? "bg-subtle text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {count !== undefined && count > 0 ? <span className="tabular text-muted-foreground">{count}</span> : null}
    </button>
  );
}

export function InboxContent({
  orgId,
  active,
  status = "all",
  onNavigate,
  className,
  compact = false,
}: InboxContentProps) {
  const router = useRouter();
  const query = useNotifications(orgId, status, active);
  const markRead = useMarkNotificationRead(orgId);
  const markAllRead = useMarkAllNotificationsRead(orgId);
  const archive = useArchiveNotification(orgId);
  const snooze = useSnoozeNotification(orgId);

  const [tab, setTab] = useState<"all" | "mentions">("all");

  const allItems = useMemo<Notification[]>(() => {
    const list = query.data?.items ?? [];
    return [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [query.data]);

  const items = useMemo<Notification[]>(
    () => (tab === "mentions" ? allItems.filter((item) => item.type === "mention") : allItems),
    [allItems, tab]
  );

  const mentionCount = useMemo(
    () => allItems.filter((item) => item.type === "mention").length,
    [allItems]
  );

  const unreadCount = query.data?.unread_count ?? 0;
  const [focusIndex, setFocusIndex] = useState(0);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setFocusIndex((current) => Math.min(current, Math.max(0, items.length - 1)));
  }, [items.length]);

  const focused = items[focusIndex] ?? null;

  const activate = useCallback(
    (notification: Notification) => {
      if (notification.read_at === null) {
        markRead.mutate(notification.id);
      }
      const href = entityHref(orgId, notification);
      onNavigate?.();
      if (href) router.push(href);
    },
    [markRead, orgId, onNavigate, router]
  );

  useShortcut(
    {
      id: "inbox-focus-down",
      keys: "j",
      label: "Next notification",
      scope: "action",
      enabled: active && items.length > 0,
    },
    () => setFocusIndex((index) => Math.min(index + 1, items.length - 1))
  );

  useShortcut(
    {
      id: "inbox-focus-up",
      keys: "k",
      label: "Previous notification",
      scope: "action",
      enabled: active && items.length > 0,
    },
    () => setFocusIndex((index) => Math.max(index - 1, 0))
  );

  useShortcut(
    {
      id: "inbox-open",
      keys: "Enter",
      label: "Open notification",
      scope: "action",
      enabled: active && focused !== null,
    },
    () => {
      if (focused) activate(focused);
    }
  );

  useShortcut(
    {
      id: "inbox-archive",
      keys: "e",
      label: "Archive notification",
      scope: "action",
      enabled: active && focused !== null,
    },
    () => {
      if (focused) archive.mutate(focused.id);
    }
  );

  useShortcut(
    {
      id: "inbox-snooze",
      keys: "h",
      label: "Snooze notification",
      scope: "action",
      enabled: active && focused !== null,
    },
    () => {
      if (focused) snooze.mutate({ id: focused.id, until: snoozeUntil() });
    }
  );

  useShortcut(
    {
      id: "inbox-mark-all-read",
      keys: "shift+e",
      label: "Mark all read",
      scope: "action",
      enabled: active && unreadCount > 0,
    },
    () => markAllRead.mutate()
  );

  useEffect(() => {
    if (active) rowRefs.current[focusIndex]?.scrollIntoView({ block: "nearest" });
  }, [active, focusIndex]);

  return (
    <div className={cn("flex flex-col", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Notification filter" className="flex items-center gap-0.5">
            <InboxTab label="All" selected={tab === "all"} onClick={() => setTab("all")} />
            <InboxTab
              label="Mentions"
              count={mentionCount}
              selected={tab === "mentions"}
              onClick={() => setTab("mentions")}
            />
          </div>
          {unreadCount > 0 ? (
            <span className="tabular text-caption text-muted-foreground">
              {unreadCount} unread
            </span>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<CheckCheck />}
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
        >
          Mark all read
        </Button>
      </header>

      <div className={cn("min-h-0 flex-1 overflow-y-auto p-1.5", compact && "max-h-[26rem]")}>
        {query.isPending ? (
          <div className="flex flex-col gap-1 p-1.5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-start gap-3 px-1.5 py-2">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2 pt-0.5">
                  <Skeleton className="h-3 w-2/5 rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Inbox />}
            title="You're all caught up"
            description="New assignments, mentions, and closed loops will land here."
            className={compact ? "border-0 bg-transparent py-10" : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((notification, index) => (
              <li key={notification.id}>
                <NotificationRow
                  ref={(node) => {
                    rowRefs.current[index] = node;
                  }}
                  notification={notification}
                  focused={index === focusIndex}
                  onActivate={() => activate(notification)}
                  onFocus={() => setFocusIndex(index)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 ? (
        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-caption text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Kbd>E</Kbd> Archive
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>H</Kbd> Snooze
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> Open
          </span>
        </footer>
      ) : null}
    </div>
  );
}
