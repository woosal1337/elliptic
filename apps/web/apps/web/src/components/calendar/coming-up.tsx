"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { cn } from "@elliptic/ui";
import type { Event } from "@/lib/types";
import { formatDuration } from "@/lib/format";
import { formatDayHeading, formatEventTimeRange } from "./calendar-utils";

function nextUpcoming(events: Event[], nowMs: number): Event | null {
  let soonest: Event | null = null;
  let soonestMs = Number.POSITIVE_INFINITY;
  for (const event of events) {
    const startsMs = new Date(event.starts_at).getTime();
    if (startsMs <= nowMs) continue;
    if (startsMs < soonestMs) {
      soonest = event;
      soonestMs = startsMs;
    }
  }
  return soonest;
}

export function ComingUp({
  events,
  onOpen,
}: {
  events: Event[];
  onOpen: (event: Event) => void;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const next = useMemo(() => nextUpcoming(events, nowMs), [events, nowMs]);

  if (!next) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-xs">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
          <CalendarClock aria-hidden="true" className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="text-small font-medium text-foreground">Nothing on the horizon</p>
          <p className="truncate text-caption text-muted-foreground">
            When you schedule an event, the next one shows here with a live countdown.
          </p>
        </div>
      </div>
    );
  }

  const isTeam = next.scope === "team";
  const secondsUntil = Math.max(0, (new Date(next.starts_at).getTime() - nowMs) / 1000);

  return (
    <button
      type="button"
      onClick={() => onOpen(next)}
      className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left shadow-xs transition-colors hover:border-input hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
        <CalendarClock aria-hidden="true" className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-mono-label font-mono uppercase tracking-wide text-muted-foreground">
            Coming up
          </span>
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full", isTeam ? "bg-accent" : "bg-muted-foreground")}
          />
        </div>
        <p className="truncate text-small font-medium text-foreground">{next.title}</p>
        <p className="truncate text-caption tabular-nums text-muted-foreground">
          {formatDayHeading(new Date(next.starts_at))} ·{" "}
          {formatEventTimeRange(next.starts_at, next.ends_at, next.all_day)}
        </p>
      </div>
      <span className="flex shrink-0 flex-col items-end">
        <span className="font-mono text-body tabular-nums text-foreground">
          in {formatDuration(secondsUntil)}
        </span>
        <span className="inline-flex items-center gap-0.5 text-caption text-muted-foreground transition-colors group-hover:text-foreground">
          Open
          <ArrowUpRight aria-hidden="true" className="size-3" />
        </span>
      </span>
    </button>
  );
}
