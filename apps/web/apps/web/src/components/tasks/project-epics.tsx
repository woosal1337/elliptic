"use client";

import { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { Badge, EmptyState, Skeleton } from "@elliptic/ui";
import { useTasks } from "@/hooks/use-task-queries";
import { ErrorState } from "@/components/error-state";
import { StatusDot } from "./task-bits";
import { TaskDetailDialog } from "./task-detail-dialog";

export function ProjectEpics({ orgId, projectId }: { orgId: string; projectId: string }) {
  const tasks = useTasks(orgId, projectId);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const epics = useMemo(
    () =>
      (tasks.data ?? [])
        .filter((task) => task.kind === "epic")
        .sort((a, b) => a.title.localeCompare(b.title)),
    [tasks.data]
  );

  const pointsByEpic = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks.data ?? []) {
      if (!task.parent_task_id || !task.estimate) continue;
      const points = Number(task.estimate);
      if (!Number.isFinite(points)) continue;
      map.set(task.parent_task_id, (map.get(task.parent_task_id) ?? 0) + points);
    }
    return map;
  }, [tasks.data]);

  if (tasks.isPending) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }
  if (tasks.isError) {
    return <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />;
  }
  if (epics.length === 0) {
    return (
      <EmptyState
        icon={<Layers />}
        title="No epics yet"
        description="Create a work item of type Epic to group related stories and tasks under it."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {epics.map((epic) => {
          const total = epic.subtask_total;
          const done = epic.subtask_done;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const points = pointsByEpic.get(epic.id) ?? 0;
          return (
            <li key={epic.id}>
              <button
                type="button"
                onClick={() => setOpenTaskId(epic.id)}
                className="flex w-full flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong hover:bg-muted/40"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="size-4 shrink-0 text-warning" aria-hidden />
                  <StatusDot status={epic.status} className="shrink-0" />
                  <span className="shrink-0 font-mono text-caption text-muted-foreground">
                    {epic.identifier}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-small font-medium text-foreground">
                    {epic.title}
                  </span>
                  {points > 0 ? (
                    <Badge variant="outline" className="tabular">
                      {points % 1 === 0 ? points : points.toFixed(1)} pts
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="tabular">
                    {done}/{total}
                  </Badge>
                </div>
                {total > 0 ? (
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="bg-success" style={{ width: `${pct}%` }} aria-hidden />
                  </div>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
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
