"use client";

import { forwardRef } from "react";
import { ArrowRight } from "lucide-react";
import {
  Avatar,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@elliptic/ui";
import { relativeTime } from "@/lib/format";
import type { Notification } from "@/hooks/use-notification-queries";
import { isMeetingActionDone, notificationMeta } from "./notification-meta";

function meetingFrame(notification: Notification): string | null {
  if (!isMeetingActionDone(notification)) return null;
  const snippet = notification.snippet?.trim();
  return snippet && snippet.length > 0 ? snippet : "a meeting";
}

export interface NotificationRowProps {
  notification: Notification;
  focused: boolean;
  onActivate: () => void;
  onFocus: () => void;
}

export const NotificationRow = forwardRef<HTMLButtonElement, NotificationRowProps>(
  ({ notification, focused, onActivate, onFocus }, ref) => {
    const meta = notificationMeta(notification.type);
    const Icon = meta.icon;
    const unread = notification.read_at === null;
    const { relative, title } = relativeTime(notification.created_at);
    const meeting = meetingFrame(notification);

    return (
      <button
        ref={ref}
        type="button"
        onClick={onActivate}
        onMouseEnter={onFocus}
        onFocus={onFocus}
        aria-current={focused || undefined}
        className={cn(
          "group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none",
          focused ? "bg-muted" : "hover:bg-muted/60"
        )}
      >
        <span className="relative mt-0.5 shrink-0">
          <Avatar name={notification.actor_name ?? "System"} size="sm" />
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border border-surface bg-surface text-muted-foreground [&_svg]:size-2.5"
          >
            <Icon />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant={meta.tone} size="sm">
              {meta.label}
            </Badge>
            {notification.actor_name ? (
              <span className="truncate text-caption text-muted-foreground">
                {notification.actor_name}
              </span>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <time
                  dateTime={notification.created_at}
                  className="tabular ml-auto shrink-0 cursor-default text-caption text-muted-foreground"
                >
                  {relative}
                </time>
              </TooltipTrigger>
              <TooltipContent>{title}</TooltipContent>
            </Tooltip>
          </span>
          <span
            className={cn(
              "truncate text-small",
              unread ? "font-medium text-foreground" : "text-foreground/80"
            )}
          >
            {notification.title}
          </span>
          {meeting ? (
            <span className="inline-flex items-center gap-1 text-caption text-success">
              from {meeting}
              <ArrowRight className="size-3" />
            </span>
          ) : notification.snippet ? (
            <span className="line-clamp-2 text-caption text-muted-foreground">
              {notification.snippet}
            </span>
          ) : null}
        </span>
        {unread ? (
          <span
            aria-label="Unread"
            className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"
          />
        ) : null}
      </button>
    );
  }
);
NotificationRow.displayName = "NotificationRow";
