"use client";

import { useState } from "react";
import { Play, Repeat, Trash2 } from "lucide-react";
import { Badge, Button, IconButton, Input, Skeleton, Switch } from "@elliptic/ui";
import { formatRelative } from "@/lib/format";
import {
  useCreateRecurringTask,
  useDeleteRecurringTask,
  useRecurringTasks,
  useRunRecurringTask,
  useUpdateRecurringTask,
} from "@/hooks/use-recurring-task-queries";

export function ProjectRecurringTasks({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const rules = useRecurringTasks(orgId, projectId);
  const create = useCreateRecurringTask(orgId, projectId);
  const update = useUpdateRecurringTask(orgId, projectId);
  const remove = useDeleteRecurringTask(orgId, projectId);
  const run = useRunRecurringTask(orgId, projectId);
  const [title, setTitle] = useState("");
  const [interval, setInterval] = useState(7);

  const submit = () => {
    if (!title.trim()) return;
    create.mutate(
      { title: title.trim(), interval_days: interval },
      { onSuccess: () => setTitle("") }
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Repeat className="size-4 text-muted-foreground" />
          Recurring work items
        </h2>
        <p className="text-caption text-muted-foreground">
          Auto-create a work item on a fixed cadence (maintenance, audits, renewals).
        </p>
      </div>

      {rules.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : (rules.data ?? []).length === 0 ? null : (
        <ul className="flex flex-col gap-1.5">
          {(rules.data ?? []).map((rule) => (
            <li
              key={rule.id}
              className="group flex items-center gap-2 rounded-md border border-border px-3 py-2 text-small"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">{rule.title}</span>
              <Badge variant="neutral" size="sm">
                every {rule.interval_days}d
              </Badge>
              <span className="hidden text-caption text-muted-foreground sm:inline">
                next {formatRelative(rule.next_run_at)}
              </span>
              {canManage ? (
                <>
                  <Switch
                    checked={rule.active}
                    aria-label="Toggle active"
                    onCheckedChange={(active) => update.mutate({ ruleId: rule.id, active })}
                  />
                  <IconButton aria-label="Run now" variant="ghost" size="sm" onClick={() => run.mutate(rule.id)}>
                    <Play className="size-4" />
                  </IconButton>
                  <IconButton
                    aria-label="Delete"
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => remove.mutate(rule.id)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <Input
            placeholder="Work item title"
            value={title}
            className="w-56"
            onChange={(event) => setTitle(event.target.value)}
          />
          <label className="flex items-center gap-1 text-caption text-muted-foreground">
            every
            <Input
              type="number"
              min={1}
              max={365}
              value={interval}
              className="w-16"
              onChange={(event) => setInterval(Number(event.target.value))}
            />
            days
          </label>
          <Button size="sm" onClick={submit} loading={create.isPending} disabled={!title.trim()}>
            Add
          </Button>
        </div>
      ) : null}
    </section>
  );
}
