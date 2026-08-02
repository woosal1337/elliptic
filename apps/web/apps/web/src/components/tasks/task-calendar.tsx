"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Skeleton, cn } from "@elliptic/ui";
import type { Task } from "@/lib/types";
import { useTasks } from "@/hooks/use-task-queries";
import { ErrorState } from "@/components/error-state";
import { StatusDot } from "./task-bits";
import { TaskDetailDialog } from "./task-detail-dialog";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dayKey(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function TaskCalendar({ orgId, projectId }: { orgId: string; projectId: string }) {
  const tasks = useTasks(orgId, projectId);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks.data ?? []) {
      if (!task.due_date) continue;
      const key = task.due_date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks.data]);

  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells: { day: number | null; key: string | null }[] = [];
    for (let index = 0; index < offset; index += 1) cells.push({ day: null, key: null });
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, key: dayKey(cursor.year, cursor.month, day) });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, key: null });
    return cells;
  }, [cursor]);

  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());

  const step = (delta: number) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  if (tasks.isPending) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }
  if (tasks.isError) {
    return <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-small font-semibold text-foreground">
          {MONTHS[cursor.month]} {cursor.year}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
          >
            Today
          </Button>
          <Button size="sm" variant="ghost" aria-label="Previous month" onClick={() => step(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Next month" onClick={() => step(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="bg-surface px-2 py-1.5 text-mono-label font-mono text-muted-foreground/70"
          >
            {label}
          </div>
        ))}
        {grid.map((cell, index) => {
          const dayTasks = cell.key ? (tasksByDay.get(cell.key) ?? []) : [];
          const isToday = cell.key === todayKey;
          return (
            <div
              key={cell.key ?? `empty-${index}`}
              className={cn(
                "min-h-24 bg-surface p-1.5",
                cell.day === null && "bg-muted/30"
              )}
            >
              {cell.day !== null ? (
                <>
                  <span
                    className={cn(
                      "inline-flex size-5 items-center justify-center rounded-full text-caption tabular",
                      isToday
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setOpenTaskId(task.id)}
                        className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-caption text-foreground transition-colors hover:bg-muted/60"
                      >
                        <StatusDot status={task.status} className="shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </button>
                    ))}
                    {dayTasks.length > 3 ? (
                      <span className="px-1 text-caption text-muted-foreground">
                        +{dayTasks.length - 3} more
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
      <TaskDetailDialog
        orgId={orgId}
        projectId={projectId}
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
        onNavigate={(id) => setOpenTaskId(id)}
      />
    </div>
  );
}
