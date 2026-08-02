import type { TaskPriority, TaskStatus } from "./types";

export type StatusCategory = "backlog" | "unstarted" | "started" | "completed" | "cancelled";

// Must list every TaskStatus: tasks-table.tsx groups by walking this array and
// drops anything it does not contain, so an omission hides tasks entirely.
export const STATUS_ORDER: readonly TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
  "duplicate",
];

export const CATEGORY_ORDER: readonly StatusCategory[] = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "cancelled",
];

export const STATUS_TO_CATEGORY: Record<TaskStatus, StatusCategory> = {
  backlog: "backlog",
  todo: "unstarted",
  in_progress: "started",
  in_review: "started",
  done: "completed",
  cancelled: "cancelled",
  duplicate: "cancelled",
};

export const CATEGORY_LABELS: Record<StatusCategory, string> = {
  backlog: "Backlog",
  unstarted: "Unstarted",
  started: "Started",
  completed: "Completed",
  cancelled: "Canceled",
};

export const CATEGORY_DOT_CLASSES: Record<StatusCategory, string> = {
  backlog: "bg-muted-foreground/40",
  unstarted: "bg-muted-foreground",
  started: "bg-warning",
  completed: "bg-success",
  cancelled: "bg-danger/60",
};

export function statusCategory(status: TaskStatus): StatusCategory {
  return STATUS_TO_CATEGORY[status];
}

export interface CategoryProgress {
  completed: number;
  total: number;
  ratio: number;
  percent: number;
}

export function computeProgress(statuses: readonly TaskStatus[]): CategoryProgress {
  let completed = 0;
  let total = 0;
  for (const status of statuses) {
    const category = STATUS_TO_CATEGORY[status];
    if (category === "cancelled") {
      continue;
    }
    total += 1;
    if (category === "completed") {
      completed += 1;
    }
  }
  const ratio = total === 0 ? 0 : completed / total;
  return { completed, total, ratio, percent: Math.round(ratio * 100) };
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
  duplicate: "Duplicate",
};

export const STATUS_DOT_CLASSES: Record<TaskStatus, string> = {
  backlog: "bg-muted-foreground/40",
  todo: "bg-muted-foreground",
  in_progress: "bg-warning",
  in_review: "bg-accent",
  done: "bg-success",
  cancelled: "bg-danger/60",
  duplicate: "bg-muted-foreground/60",
};

// Group headers carry a wash of their status colour rather than one flat grey,
// so a long list stays readable while scrolling: the band you are under tells
// you which group you are in without reading it. Kept faint on purpose — this
// is a tint behind text, not a badge.
export const STATUS_TINT_CLASSES: Record<TaskStatus, string> = {
  backlog: "bg-muted-foreground/8",
  todo: "bg-muted-foreground/10",
  in_progress: "bg-warning/8",
  in_review: "bg-accent/8",
  done: "bg-success/8",
  cancelled: "bg-danger/8",
  duplicate: "bg-muted-foreground/8",
};

export const PRIORITY_SORT: readonly TaskPriority[] = ["urgent", "high", "medium", "low", "none"];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: "No priority",
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_DOT_CLASSES: Record<TaskPriority, string> = {
  none: "bg-muted-foreground/30",
  urgent: "bg-danger",
  high: "bg-warning",
  medium: "bg-accent",
  low: "bg-muted-foreground",
};

export function parsePriority(value: string): TaskPriority {
  if (
    value === "none" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
  ) {
    return value;
  }
  return "none";
}
