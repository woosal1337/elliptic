"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@elliptic/ui";
import type { Task } from "@/lib/types";
import {
  useAssignTaskToCycle,
  useCycles,
  useUnassignTaskFromCycle,
} from "@/hooks/use-cycle-queries";

const NONE = "__none__";

export function TaskCycleField({
  orgId,
  projectId,
  task,
}: {
  orgId: string;
  projectId: string;
  task: Task;
}) {
  const cycles = useCycles(orgId, projectId);
  const assign = useAssignTaskToCycle(orgId, projectId);
  const unassign = useUnassignTaskFromCycle(orgId, projectId);
  const current = task.cycle_id ?? NONE;

  const onChange = (value: string) => {
    if (value === current) return;
    if (value === NONE) {
      if (task.cycle_id) unassign.mutate({ cycleId: task.cycle_id, taskId: task.id });
    } else {
      assign.mutate({ cycleId: value, taskId: task.id });
    }
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger aria-label="Cycle">
        <SelectValue placeholder="No cycle" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No cycle</SelectItem>
        {(cycles.data ?? []).map((cycle) => (
          <SelectItem key={cycle.id} value={cycle.id}>
            {cycle.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
