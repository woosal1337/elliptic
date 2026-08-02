"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@elliptic/ui";
import type { Event } from "@/lib/types";
import { formatDayHeading, formatEventTime } from "./calendar-utils";

export function DayEventsPopover({
  date,
  events,
  overflow,
  onSelect,
}: {
  date: Date;
  events: Event[];
  overflow: number;
  onSelect: (event: Event) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="px-1.5 text-left text-caption font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          +{overflow} more
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={6} className="w-64 p-2">
        <p className="px-1.5 pb-1.5 text-caption font-mono text-muted-foreground">
          {formatDayHeading(date)}
        </p>
        <div className="flex flex-col gap-0.5">
          {events.map((event) => {
            const isTeam = event.scope === "team";
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSelect(event);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    isTeam ? "bg-accent" : "bg-muted-foreground"
                  )}
                />
                <span className="w-14 shrink-0 font-mono text-caption tabular-nums text-muted-foreground">
                  {event.all_day ? "All day" : formatEventTime(event.starts_at)}
                </span>
                <span className="truncate text-caption font-medium text-foreground">
                  {event.title}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
