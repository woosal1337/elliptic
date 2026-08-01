"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge, Skeleton } from "@elliptic/ui";
import { TriangleAlert } from "lucide-react";
import { type TimelineTask, useProjectTimeline } from "@/hooks/use-timeline-queries";

const DAY = 24 * 60 * 60 * 1000;

function parseDate(value: string | null): number | null {
  if (!value) return null;
  const time = new Date(`${value}T00:00:00Z`).getTime();
  return Number.isNaN(time) ? null : time;
}

export function ProjectGantt({ orgId, projectId }: { orgId: string; projectId: string }) {
  const timeline = useProjectTimeline(orgId, projectId);

  const range = useMemo(() => {
    const tasks = timeline.data?.tasks ?? [];
    const dates: number[] = [];
    for (const task of tasks) {
      const start = parseDate(task.start_date);
      const due = parseDate(task.due_date);
      if (start !== null) dates.push(start);
      if (due !== null) dates.push(due);
    }
    if (dates.length === 0) return null;
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return { min, max: max === min ? min + DAY : max };
  }, [timeline.data]);

  const dated = (timeline.data?.tasks ?? []).filter(
    (t) => t.start_date || t.due_date
  );
  const undated = (timeline.data?.tasks ?? []).filter((t) => !t.start_date && !t.due_date);

  const barFor = (task: TimelineTask) => {
    if (!range) return null;
    const span = range.max - range.min;
    const start = parseDate(task.start_date) ?? parseDate(task.due_date)!;
    const due = parseDate(task.due_date) ?? parseDate(task.start_date)!;
    const left = ((start - range.min) / span) * 100;
    const width = Math.max(((due - start) / span) * 100, 1.5);
    return { left, width };
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-muted-foreground">
        Work items plotted by start/due date. The{" "}
        <span className="font-medium text-accent">critical path</span> is the longest dependency
        chain that drives the schedule.
      </p>

      {(timeline.data?.violation_count ?? 0) > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger-muted/30 px-3 py-2 text-small text-danger">
          <TriangleAlert className="size-4 shrink-0" />
          {timeline.data!.violation_count}{" "}
          {timeline.data!.violation_count === 1 ? "dependency is" : "dependencies are"} violated —
          a successor is scheduled before its predecessor allows.
        </div>
      ) : null}

      {timeline.isPending ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : dated.length === 0 ? (
        <p className="text-small text-muted-foreground">
          No scheduled work items yet — set start and due dates to see the timeline.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 overflow-hidden rounded-xl border border-border bg-surface p-4">
          {dated.map((task) => {
            const bar = barFor(task);
            return (
              <div key={task.id} className="flex items-center gap-3">
                <Link
                  href={`/app/${orgId}/projects/${projectId}?task=${task.id}`}
                  className="flex w-48 shrink-0 items-center gap-2 truncate text-small hover:underline"
                >
                  {task.identifier ? (
                    <span className="shrink-0 font-mono text-caption text-muted-foreground">
                      {task.identifier}
                    </span>
                  ) : null}
                  <span className="truncate text-foreground">{task.title}</span>
                </Link>
                <div className="relative h-6 flex-1 rounded bg-muted/40">
                  {bar ? (
                    <div
                      className={`absolute top-1 h-4 rounded ${
                        task.is_violated
                          ? "bg-danger ring-1 ring-danger"
                          : task.on_critical_path
                            ? "bg-accent ring-1 ring-accent"
                            : task.is_done
                              ? "bg-success/70"
                              : "bg-muted-foreground/60"
                      }`}
                      style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                      title={`${task.start_date ?? "?"} → ${task.due_date ?? "?"}`}
                    />
                  ) : null}
                </div>
                {task.is_violated ? (
                  <Badge variant="danger" size="sm">
                    violation
                  </Badge>
                ) : task.on_critical_path ? (
                  <Badge variant="accent" size="sm">
                    critical
                  </Badge>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {undated.length > 0 ? (
        <p className="text-caption text-muted-foreground">
          {undated.length} work {undated.length === 1 ? "item" : "items"} have no dates and aren&apos;t
          shown.
        </p>
      ) : null}
    </div>
  );
}
