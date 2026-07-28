"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/types";
import { PRIORITY_SORT } from "@/lib/task-meta";
import type { TaskSurfaceKind } from "./task-views";

export type DisplayProperty =
  | "identifier"
  | "assignee"
  | "status"
  | "priority"
  | "due"
  | "labels"
  | "progress"
  | "createdBy"
  | "updated";

export interface DisplayConfig {
  properties: Record<DisplayProperty, boolean>;
  orderBy: OrderBy;
  showEmptyGroups: boolean;
  showSubtasks: boolean;
  showBlocked: boolean;
}

export const DISPLAY_PROPERTY_ORDER: readonly DisplayProperty[] = [
  "identifier",
  "assignee",
  "status",
  "priority",
  "due",
  "labels",
  "progress",
  "createdBy",
  "updated",
];

export const DISPLAY_PROPERTY_LABELS: Record<DisplayProperty, string> = {
  identifier: "Identifier",
  assignee: "Assignee",
  status: "Status",
  priority: "Priority",
  due: "Due date",
  labels: "Labels",
  progress: "Sub-task progress",
  createdBy: "Created by",
  updated: "Updated",
};

export type OrderBy = "manual" | "priority" | "due" | "created" | "updated" | "title";

export const ORDER_BY_ORDER: readonly OrderBy[] = [
  "manual",
  "priority",
  "due",
  "created",
  "updated",
  "title",
];

export const ORDER_BY_LABELS: Record<OrderBy, string> = {
  manual: "Manual",
  priority: "Priority",
  due: "Due date",
  created: "Created",
  updated: "Updated",
  title: "Title",
};

const PRIORITY_RANK = new Map<string, number>(
  PRIORITY_SORT.map((priority, index) => [priority, index])
);

/** Most recently touched first — the tie-break for every order but manual. */
function byRecency(a: Task, b: Task): number {
  return b.updated_at.localeCompare(a.updated_at);
}

export function sortTasksBy<T extends Task>(tasks: readonly T[], orderBy: OrderBy): T[] {
  const sorted = [...tasks];
  switch (orderBy) {
    case "priority":
      return sorted.sort(
        (a, b) =>
          (PRIORITY_RANK.get(a.priority) ?? PRIORITY_SORT.length) -
            (PRIORITY_RANK.get(b.priority) ?? PRIORITY_SORT.length) || byRecency(a, b)
      );
    case "due":
      return sorted.sort(
        (a, b) =>
          (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31") || byRecency(a, b)
      );
    case "created":
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "updated":
      return sorted.sort(byRecency);
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "manual":
    default:
      // The one order that stays oldest-first: sort_order is the board's own
      // hand-arranged sequence, not a recency signal.
      return sorted.sort((a, b) => a.sort_order - b.sort_order);
  }
}

const COMPACT_DEFAULT: Record<DisplayProperty, boolean> = {
  identifier: true,
  assignee: true,
  status: true,
  priority: true,
  due: true,
  labels: false,
  progress: false,
  createdBy: false,
  updated: false,
};

function defaults(surface: TaskSurfaceKind): DisplayConfig {
  return {
    properties: { ...COMPACT_DEFAULT, updated: surface === "table" },
    // Whatever was touched last leads: a task that was just created, moved, or
    // completed shows up at the top of its column instead of at the bottom.
    orderBy: "updated",
    showEmptyGroups: false,
    showSubtasks: true,
    showBlocked: true,
  };
}

// v2 = the "updated" default above. Bumped so surfaces that already stored the
// old manual-order default pick the new one up instead of silently keeping it.
function storageKey(orgId: string, projectId: string, surface: TaskSurfaceKind): string {
  return `companyos:task-display:v2:${surface}:${orgId}:${projectId}`;
}

function isProperty(value: unknown): value is DisplayProperty {
  return (
    typeof value === "string" &&
    (DISPLAY_PROPERTY_ORDER as readonly string[]).includes(value)
  );
}

function isOrderBy(value: unknown): value is OrderBy {
  return typeof value === "string" && (ORDER_BY_ORDER as readonly string[]).includes(value);
}

function read(orgId: string, projectId: string, surface: TaskSurfaceKind): DisplayConfig {
  const base = defaults(surface);
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(storageKey(orgId, projectId, surface));
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<DisplayConfig>;
    const properties = { ...base.properties };
    if (parsed.properties && typeof parsed.properties === "object") {
      for (const [key, value] of Object.entries(parsed.properties)) {
        if (isProperty(key) && typeof value === "boolean") {
          properties[key] = value;
        }
      }
    }
    return {
      properties,
      orderBy: isOrderBy(parsed.orderBy) ? parsed.orderBy : base.orderBy,
      showEmptyGroups:
        typeof parsed.showEmptyGroups === "boolean"
          ? parsed.showEmptyGroups
          : base.showEmptyGroups,
      showSubtasks:
        typeof parsed.showSubtasks === "boolean" ? parsed.showSubtasks : base.showSubtasks,
      showBlocked:
        typeof parsed.showBlocked === "boolean" ? parsed.showBlocked : base.showBlocked,
    };
  } catch {
    return base;
  }
}

function write(
  orgId: string,
  projectId: string,
  surface: TaskSurfaceKind,
  config: DisplayConfig
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(orgId, projectId, surface),
      JSON.stringify(config)
    );
  } catch {
    return;
  }
}

export interface UseDisplayConfig extends DisplayConfig {
  toggleProperty: (property: DisplayProperty) => void;
  setOrderBy: (orderBy: OrderBy) => void;
  setShowEmptyGroups: (value: boolean) => void;
  setShowSubtasks: (value: boolean) => void;
  setShowBlocked: (value: boolean) => void;
  reset: () => void;
}

export function useDisplayConfig(
  orgId: string,
  projectId: string,
  surface: TaskSurfaceKind
): UseDisplayConfig {
  const [config, setConfig] = useState<DisplayConfig>(() => defaults(surface));

  useEffect(() => {
    setConfig(read(orgId, projectId, surface));
  }, [orgId, projectId, surface]);

  const toggleProperty = useCallback(
    (property: DisplayProperty) =>
      setConfig((current) => {
        const next: DisplayConfig = {
          ...current,
          properties: {
            ...current.properties,
            [property]: !current.properties[property],
          },
        };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const setOrderBy = useCallback(
    (orderBy: OrderBy) =>
      setConfig((current) => {
        const next: DisplayConfig = { ...current, orderBy };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const setShowEmptyGroups = useCallback(
    (value: boolean) =>
      setConfig((current) => {
        const next: DisplayConfig = { ...current, showEmptyGroups: value };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const setShowSubtasks = useCallback(
    (value: boolean) =>
      setConfig((current) => {
        const next: DisplayConfig = { ...current, showSubtasks: value };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const setShowBlocked = useCallback(
    (value: boolean) =>
      setConfig((current) => {
        const next: DisplayConfig = { ...current, showBlocked: value };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const reset = useCallback(() => {
    const next = defaults(surface);
    setConfig(next);
    write(orgId, projectId, surface, next);
  }, [orgId, projectId, surface]);

  return useMemo(
    () => ({
      ...config,
      toggleProperty,
      setOrderBy,
      setShowEmptyGroups,
      setShowSubtasks,
      setShowBlocked,
      reset,
    }),
    [config, toggleProperty, setOrderBy, setShowEmptyGroups, setShowSubtasks, setShowBlocked, reset]
  );
}
