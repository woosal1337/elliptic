"use client";

import { useState } from "react";
import { CalendarClock, CalendarRange, Lock, Plus, Trash2 } from "lucide-react";
import { RecurringCyclesDialog } from "@/components/projects/recurring-cycles-dialog";
import {
  Badge,
  Button,
  DatePicker,
  EmptyState,
  IconButton,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import type { Cycle, CycleStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import {
  useCompleteCycle,
  useCreateCycle,
  useCycles,
  useDeleteCycle,
  useStartCycle,
  useTransferCycle,
} from "@/hooks/use-cycle-queries";
import { ErrorState } from "@/components/error-state";
import { CycleVelocity } from "@/components/projects/cycle-velocity";

const STATUS_META: Record<CycleStatus, { label: string; variant: "neutral" | "success" }> = {
  upcoming: { label: "Upcoming", variant: "neutral" },
  active: { label: "Active", variant: "success" },
  completed: { label: "Completed", variant: "neutral" },
};

function dateRange(cycle: Cycle): string {
  if (cycle.start_date && cycle.end_date) {
    return `${formatDate(cycle.start_date)} – ${formatDate(cycle.end_date)}`;
  }
  if (cycle.start_date) return `Starts ${formatDate(cycle.start_date)}`;
  if (cycle.end_date) return `Ends ${formatDate(cycle.end_date)}`;
  return "No dates set";
}

export function ProjectCycles({ orgId, projectId }: { orgId: string; projectId: string }) {
  const cycles = useCycles(orgId, projectId);
  const createCycle = useCreateCycle(orgId, projectId);
  const deleteCycle = useDeleteCycle(orgId, projectId);
  const startCycle = useStartCycle(orgId, projectId);
  const completeCycle = useCompleteCycle(orgId, projectId);
  const transfer = useTransferCycle(orgId, projectId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    createCycle.mutate(
      { name: name.trim(), start_date: start || null, end_date: end || null },
      {
        onSuccess: () => {
          setName("");
          setStart("");
          setEnd("");
          setAdding(false);
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <RecurringCyclesDialog
        orgId={orgId}
        projectId={projectId}
        open={generating}
        onOpenChange={setGenerating}
      />
      <CycleVelocity orgId={orgId} projectId={projectId} />
      {!adding ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setGenerating(true)}>
            <CalendarClock className="size-3.5" />
            Generate cycles
          </Button>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" />
            New cycle
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Input
            autoFocus
            placeholder="Cycle name (e.g. Sprint 1)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Cycle name"
          />
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="cycle-start">Start</Label>
              <DatePicker
                id="cycle-start"
                value={start}
                onChange={(value) => setStart(value ?? "")}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="cycle-end">End</Label>
              <DatePicker
                id="cycle-end"
                value={end}
                onChange={(value) => setEnd(value ?? "")}
                className="w-44"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              loading={createCycle.isPending}
              disabled={name.trim().length === 0}
            >
              Create cycle
            </Button>
          </div>
        </div>
      )}

      {cycles.isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : cycles.isError ? (
        <ErrorState error={cycles.error} onRetry={() => void cycles.refetch()} />
      ) : (cycles.data ?? []).length === 0 ? (
        <EmptyState
          icon={<CalendarRange />}
          title="No cycles yet"
          description="Create time-boxed iterations (sprints) and assign work items to them."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {cycles.data.map((cycle) => {
            const pct =
              cycle.task_total > 0 ? Math.round((cycle.task_done / cycle.task_total) * 100) : 0;
            const total = cycle.task_total || 1;
            return (
              <li
                key={cycle.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-small font-semibold text-foreground">{cycle.name}</span>
                    <Badge variant={STATUS_META[cycle.status].variant} dot={cycle.status === "active"}>
                      {STATUS_META[cycle.status].label}
                    </Badge>
                    {cycle.status === "completed" ? (
                      <span
                        className="inline-flex items-center gap-1 text-caption text-muted-foreground"
                        title="Completed cycles are locked"
                      >
                        <Lock className="size-3" />
                        {cycle.final_completed_count ?? cycle.task_done}/
                        {cycle.final_total_count ?? cycle.task_total} done
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    {cycle.status === "upcoming" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startCycle.mutate(cycle.id)}
                        disabled={startCycle.isPending}
                      >
                        Start
                      </Button>
                    ) : null}
                    {cycle.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeCycle.mutate(cycle.id)}
                        disabled={completeCycle.isPending}
                      >
                        Complete
                      </Button>
                    ) : null}
                    <IconButton
                      aria-label={`Delete ${cycle.name}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCycle.mutate(cycle.id)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <CalendarRange className="size-3.5" />
                  {dateRange(cycle)}
                  <span className="px-1 text-muted-foreground/50">·</span>
                  <span className="tabular">{pct}% complete</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  {cycle.task_done > 0 ? (
                    <div
                      className="bg-success"
                      style={{ width: `${(cycle.task_done / total) * 100}%` }}
                      aria-hidden
                    />
                  ) : null}
                  {cycle.started > 0 ? (
                    <div
                      className="bg-warning"
                      style={{ width: `${(cycle.started / total) * 100}%` }}
                      aria-hidden
                    />
                  ) : null}
                  {cycle.todo > 0 ? (
                    <div
                      className="bg-border-strong"
                      style={{ width: `${(cycle.todo / total) * 100}%` }}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-success" aria-hidden />
                    <span className="tabular font-medium text-foreground">{cycle.task_done}</span>{" "}
                    done
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-warning" aria-hidden />
                    <span className="tabular font-medium text-foreground">{cycle.started}</span>{" "}
                    in progress
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-border-strong" aria-hidden />
                    <span className="tabular font-medium text-foreground">{cycle.todo}</span> to do
                  </span>
                </div>
                {cycles.data.length > 1 ? (
                  <Select
                    onValueChange={(targetCycleId) =>
                      transfer.mutate({ cycleId: cycle.id, targetCycleId })
                    }
                  >
                    <SelectTrigger
                      className="h-7 w-auto self-start text-caption text-muted-foreground"
                      aria-label="Transfer incomplete items"
                    >
                      <SelectValue placeholder="Move incomplete →" />
                    </SelectTrigger>
                    <SelectContent>
                      {cycles.data
                        .filter((other) => other.id !== cycle.id)
                        .map((other) => (
                          <SelectItem key={other.id} value={other.id}>
                            {other.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
