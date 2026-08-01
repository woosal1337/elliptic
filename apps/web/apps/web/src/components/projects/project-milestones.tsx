"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Flag, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  DatePicker,
  EmptyState,
  IconButton,
  Input,
  Skeleton,
} from "@elliptic/ui";
import type { Milestone } from "@/lib/types";
import { formatDate } from "@/lib/format";
import {
  useCreateMilestone,
  useDeleteMilestone,
  useMilestones,
  useMilestoneTasks,
  useUpdateMilestone,
} from "@/hooks/use-milestone-queries";
import { ErrorState } from "@/components/error-state";
import { StatusDot } from "@/components/tasks/task-bits";
import { MilestoneTimeline } from "@/components/projects/milestone-timeline";

function MilestoneItems({
  orgId,
  projectId,
  milestoneId,
}: {
  orgId: string;
  projectId: string;
  milestoneId: string;
}) {
  const tasks = useMilestoneTasks(orgId, projectId, milestoneId, true);
  if (tasks.isPending) return <Skeleton className="h-8 w-full rounded-md" />;
  const rows = tasks.data ?? [];
  if (rows.length === 0) {
    return <p className="px-2 py-1 text-caption text-muted-foreground">No work items linked yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {rows.map((task) => (
        <li key={task.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-small">
          <StatusDot status={task.status} />
          <span className="shrink-0 font-mono text-caption text-muted-foreground">
            {task.identifier}
          </span>
          <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProjectMilestones({ orgId, projectId }: { orgId: string; projectId: string }) {
  const milestones = useMilestones(orgId, projectId);
  const createMilestone = useCreateMilestone(orgId, projectId);
  const updateMilestone = useUpdateMilestone(orgId, projectId);
  const deleteMilestone = useDeleteMilestone(orgId, projectId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = () => {
    if (!name.trim()) return;
    createMilestone.mutate(
      { name: name.trim(), target_date: target || null },
      {
        onSuccess: () => {
          setName("");
          setTarget("");
          setAdding(false);
        },
      }
    );
  };

  const rows = milestones.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-small text-muted-foreground">
          Date-anchored delivery checkpoints with progress from linked work items.
        </p>
        {!adding ? (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            New milestone
          </Button>
        ) : null}
      </div>

      {adding ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <Input
            placeholder="Milestone name (e.g. Public beta)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Milestone name"
            className="min-w-48 flex-1"
          />
          <DatePicker
            value={target}
            onChange={(value) => setTarget(value ?? "")}
            placeholder="Target date"
            aria-label="Target date"
            className="w-44"
          />
          <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            loading={createMilestone.isPending}
            disabled={name.trim().length === 0}
          >
            Create
          </Button>
        </div>
      ) : null}

      {milestones.isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : milestones.isError ? (
        <ErrorState error={milestones.error} onRetry={() => void milestones.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Flag />}
          title="No milestones yet"
          description="Create a delivery checkpoint and link work items to track progress toward it."
        />
      ) : (
        <>
          <MilestoneTimeline milestones={rows} />
          <ul className="flex flex-col gap-2">
          {rows.map((milestone: Milestone) => {
            const total = milestone.task_total || 1;
            const pct = Math.round((milestone.task_done / total) * 100);
            return (
              <li
                key={milestone.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={expanded.has(milestone.id) ? "Collapse" : "Expand"}
                      onClick={() => toggleExpanded(milestone.id)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {expanded.has(milestone.id) ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                    <span className="text-small font-semibold text-foreground">
                      {milestone.name}
                    </span>
                    <Badge variant={milestone.status === "completed" ? "success" : "neutral"}>
                      {milestone.status === "completed" ? "Completed" : "Upcoming"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {milestone.status === "upcoming" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateMilestone.mutate({
                            milestoneId: milestone.id,
                            status: "completed",
                          })
                        }
                      >
                        Complete
                      </Button>
                    ) : null}
                    <IconButton
                      aria-label={`Delete ${milestone.name}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMilestone.mutate(milestone.id)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <Flag className="size-3.5" />
                  {milestone.target_date ? formatDate(milestone.target_date) : "No target date"}
                  <span className="px-1 text-muted-foreground/50">·</span>
                  <span className="tabular">
                    {milestone.task_done}/{milestone.task_total} done
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-success"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                </div>
                {expanded.has(milestone.id) ? (
                  <div className="mt-1 border-t border-border pt-2">
                    <MilestoneItems
                      orgId={orgId}
                      projectId={projectId}
                      milestoneId={milestone.id}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
          </ul>
        </>
      )}
    </div>
  );
}
