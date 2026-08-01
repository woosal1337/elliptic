"use client";

import { useMemo } from "react";
import { Skeleton } from "@elliptic/ui";
import { statusCategory, type StatusCategory } from "@/lib/task-meta";
import { useTasks } from "@/hooks/use-task-queries";

export function ProjectOverviewStats({ orgId, projectId }: { orgId: string; projectId: string }) {
  const tasks = useTasks(orgId, projectId);

  const stats = useMemo(() => {
    const list = tasks.data ?? [];
    const counts: Record<StatusCategory, number> = {
      backlog: 0,
      unstarted: 0,
      started: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const task of list) counts[statusCategory(task.status)] += 1;
    const total = list.length;
    const active = total - counts.cancelled;
    const open = counts.backlog + counts.unstarted;
    const completion = active > 0 ? Math.round((counts.completed / active) * 100) : 0;
    return { total, counts, open, active, completion };
  }, [tasks.data]);

  if (tasks.isPending) {
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }
  if (tasks.isError || stats.total === 0) {
    return null;
  }

  const segments = [
    { label: "Done", value: stats.counts.completed, className: "bg-success" },
    { label: "In progress", value: stats.counts.started, className: "bg-warning" },
    { label: "Open", value: stats.open, className: "bg-border-strong" },
  ];
  const denom = stats.active || 1;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-small font-semibold text-foreground">Progress</h3>
        <span className="text-small text-muted-foreground">
          <span className="tabular font-semibold text-foreground">{stats.completion}%</span> complete
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) =>
          segment.value > 0 ? (
            <div
              key={segment.label}
              className={segment.className}
              style={{ width: `${(segment.value / denom) * 100}%` }}
              aria-hidden
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className="inline-flex items-center gap-1.5 text-caption text-muted-foreground"
          >
            <span className={`size-2 rounded-full ${segment.className}`} aria-hidden />
            <span className="tabular font-medium text-foreground">{segment.value}</span>
            {segment.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
          <span className="tabular font-medium text-foreground">{stats.total}</span>
          total
        </span>
      </div>
    </section>
  );
}
