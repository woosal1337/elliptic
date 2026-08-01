"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock, FileText, MapPin, Users } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  cn,
} from "@elliptic/ui";
import type { Event } from "@/lib/types";
import { formatEventTime, formatEventTimeRange } from "./calendar-utils";

function ContextRow({
  icon: Icon,
  children,
}: {
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-small text-muted-foreground">
      <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span className="min-w-0 text-foreground/90">{children}</span>
    </div>
  );
}

export function CalendarEventChip({
  orgId,
  event,
  onOpen,
}: {
  orgId: string;
  event: Event;
  onOpen: (event: Event) => void;
}) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const isTeam = event.scope === "team";
  const hasMeeting = Boolean(event.meeting_id);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          onClick={() => onOpen(event)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          aria-describedby={open ? popoverId : undefined}
          className={cn(
            "group flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            isTeam ? "bg-accent-muted hover:bg-accent-muted/70" : "bg-subtle hover:bg-subtle/70"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              isTeam ? "bg-accent" : "bg-muted-foreground"
            )}
          />
          {!event.all_day ? (
            <span
              className={cn(
                "w-12 shrink-0 text-right font-mono text-caption tabular-nums",
                isTeam ? "text-accent" : "text-muted-foreground"
              )}
            >
              {formatEventTime(event.starts_at)}
            </span>
          ) : null}
          <span
            className={cn(
              "truncate text-caption font-medium",
              isTeam ? "text-accent" : "text-foreground"
            )}
          >
            {event.title}
          </span>
          {hasMeeting ? (
            <FileText
              aria-label="Linked meeting"
              className={cn(
                "ml-auto size-3 shrink-0",
                isTeam ? "text-accent/80" : "text-muted-foreground"
              )}
            />
          ) : null}
        </button>
      </PopoverAnchor>
      <PopoverContent
        id={popoverId}
        align="start"
        side="top"
        sideOffset={6}
        onOpenAutoFocus={(eventArg) => eventArg.preventDefault()}
        className="w-64 p-3"
      >
        <div className="flex flex-col gap-2">
          <p className="text-small font-semibold leading-tight text-foreground">
            {event.title}
          </p>
          <div className="flex flex-col gap-1.5">
            <ContextRow icon={Clock}>
              <span className="tabular tabular-nums">
                {formatEventTimeRange(event.starts_at, event.ends_at, event.all_day)}
              </span>
            </ContextRow>
            <ContextRow icon={Users}>{isTeam ? "Team event" : "Personal"}</ContextRow>
            {event.location ? (
              <ContextRow icon={MapPin}>
                <span className="truncate">{event.location}</span>
              </ContextRow>
            ) : null}
          </div>
          {hasMeeting ? (
            <Link
              href={`/app/${orgId}/meetings/${event.meeting_id}`}
              className="inline-flex w-fit items-center gap-1 rounded-sm text-caption font-medium text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <FileText aria-hidden="true" className="size-3" />
              Open meeting
              <ArrowUpRight aria-hidden="true" className="size-3" />
            </Link>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
