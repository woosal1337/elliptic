"use client";

import { useMemo } from "react";
import { cn } from "@elliptic/ui";
import type { Module } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface Marker {
  module: Module;
  pct: number;
  tone: "done" | "overdue" | "active";
}

const TONE: Record<Marker["tone"], { fill: string; ring: string; text: string }> = {
  done: { fill: "bg-success", ring: "ring-success/30", text: "text-success" },
  overdue: { fill: "bg-danger", ring: "ring-danger/30", text: "text-danger" },
  active: { fill: "bg-accent", ring: "ring-accent/30", text: "text-accent" },
};

export function ModuleTimeline({ modules }: { modules: Module[] }) {
  const markers = useMemo<Marker[]>(() => {
    const dated = modules
      .filter((module) => module.target_date)
      .map((module) => ({ module, time: new Date(module.target_date as string).getTime() }))
      .filter((entry) => !Number.isNaN(entry.time))
      .sort((a, b) => a.time - b.time);
    if (dated.length === 0) return [];

    const min = dated[0]!.time;
    const max = dated[dated.length - 1]!.time;
    const span = max - min || 1;
    const now = Date.now();

    return dated.map(({ module, time }) => {
      const tone: Marker["tone"] =
        module.status === "completed"
          ? "done"
          : time < now && module.status !== "cancelled"
            ? "overdue"
            : "active";
      return { module, pct: dated.length === 1 ? 50 : ((time - min) / span) * 100, tone };
    });
  }, [modules]);

  if (markers.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-caption text-muted-foreground">
        Add target dates to modules to see them on the timeline.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="relative mx-2 mb-10 mt-6 h-0.5 rounded-full bg-border">
        {markers.map(({ module, pct, tone }) => {
          const meta = TONE[tone];
          return (
            <div
              key={module.id}
              className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${pct}%` }}
            >
              <div
                className={cn("size-3 rotate-45 rounded-[2px] ring-4", meta.fill, meta.ring)}
                title={`${module.name} · ${formatDate(module.target_date as string)}`}
              />
              <div className="absolute top-4 flex w-28 flex-col items-center gap-0.5 text-center">
                <span className="truncate text-caption font-medium text-foreground">
                  {module.name}
                </span>
                <span className={cn("text-caption tabular", meta.text)}>
                  {formatDate(module.target_date as string)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
