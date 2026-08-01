"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@elliptic/ui";
import type { Task } from "@/lib/types";
import {
  useAssignTaskToMilestone,
  useMilestones,
  useUnassignTaskFromMilestone,
} from "@/hooks/use-milestone-queries";

const NONE = "__none__";

export function TaskMilestoneField({
  orgId,
  projectId,
  task,
}: {
  orgId: string;
  projectId: string;
  task: Task;
}) {
  const milestones = useMilestones(orgId, projectId);
  const assign = useAssignTaskToMilestone(orgId, projectId);
  const unassign = useUnassignTaskFromMilestone(orgId, projectId);
  const current = task.milestone_id ?? NONE;

  const onChange = (value: string) => {
    if (value === current) return;
    if (value === NONE) {
      if (task.milestone_id)
        unassign.mutate({ milestoneId: task.milestone_id, taskId: task.id });
    } else {
      assign.mutate({ milestoneId: value, taskId: task.id });
    }
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger aria-label="Milestone">
        <SelectValue placeholder="No milestone" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No milestone</SelectItem>
        {(milestones.data ?? []).map((milestone) => (
          <SelectItem key={milestone.id} value={milestone.id}>
            {milestone.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
