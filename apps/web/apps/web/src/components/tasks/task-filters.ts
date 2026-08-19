"use client";

import { useCallback, useMemo, useState } from "react";
import type { Label, Task, TaskPriority } from "@/lib/types";

export interface TaskFilters {
  priorities: TaskPriority[];
  labelIds: string[];
}

export const EMPTY_TASK_FILTERS: TaskFilters = { priorities: [], labelIds: [] };

export function matchesTaskFilters(task: Task, filters: TaskFilters): boolean {
  if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
    return false;
  }
  if (filters.labelIds.length > 0 && !task.labels.some((label) => filters.labelIds.includes(label.id))) {
    return false;
  }
  return true;
}

export function collectLabels(tasks: readonly Task[]): Label[] {
  const byId = new Map<string, Label>();
  for (const task of tasks) {
    for (const label of task.labels) {
      if (!byId.has(label.id)) byId.set(label.id, label);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export interface UseTaskFilters {
  filters: TaskFilters;
  activeCount: number;
  togglePriority: (priority: TaskPriority) => void;
  toggleLabel: (labelId: string) => void;
  clear: () => void;
}

export function useTaskFilters(): UseTaskFilters {
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS);

  const togglePriority = useCallback(
    (priority: TaskPriority) =>
      setFilters((current) => ({
        ...current,
        priorities: current.priorities.includes(priority)
          ? current.priorities.filter((value) => value !== priority)
          : [...current.priorities, priority],
      })),
    []
  );

  const toggleLabel = useCallback(
    (labelId: string) =>
      setFilters((current) => ({
        ...current,
        labelIds: current.labelIds.includes(labelId)
          ? current.labelIds.filter((value) => value !== labelId)
          : [...current.labelIds, labelId],
      })),
    []
  );

  const clear = useCallback(() => setFilters(EMPTY_TASK_FILTERS), []);

  const activeCount = filters.priorities.length + filters.labelIds.length;

  return useMemo(
    () => ({ filters, activeCount, togglePriority, toggleLabel, clear }),
    [filters, activeCount, togglePriority, toggleLabel, clear]
  );
}
