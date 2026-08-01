"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@elliptic/ui";
import type { Task } from "@/lib/types";
import {
  useAssignTaskToModule,
  useModules,
  useUnassignTaskFromModule,
} from "@/hooks/use-module-queries";

const NONE = "__none__";

export function TaskModuleField({
  orgId,
  projectId,
  task,
}: {
  orgId: string;
  projectId: string;
  task: Task;
}) {
  const modules = useModules(orgId, projectId);
  const assign = useAssignTaskToModule(orgId, projectId);
  const unassign = useUnassignTaskFromModule(orgId, projectId);
  const current = task.module_id ?? NONE;

  const onChange = (value: string) => {
    if (value === current) return;
    if (value === NONE) {
      if (task.module_id) unassign.mutate({ moduleId: task.module_id, taskId: task.id });
    } else {
      assign.mutate({ moduleId: value, taskId: task.id });
    }
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger aria-label="Module">
        <SelectValue placeholder="No module" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No module</SelectItem>
        {(modules.data ?? []).map((module) => (
          <SelectItem key={module.id} value={module.id}>
            {module.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
