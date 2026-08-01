"use client";

import { useCallback, useEffect, useState } from "react";

export type TaskViewMode = "board" | "list";
export type TableDensity = "comfortable" | "compact";
export type Swimlane = "none" | "assignee" | "priority";

interface TaskViewPrefs {
  view: TaskViewMode;
  density: TableDensity;
  swimlane: Swimlane;
}

const DEFAULTS: TaskViewPrefs = {
  view: "board",
  density: "comfortable",
  swimlane: "none",
};

function isViewMode(value: unknown): value is TaskViewMode {
  return value === "board" || value === "list";
}

function isDensity(value: unknown): value is TableDensity {
  return value === "comfortable" || value === "compact";
}

function isSwimlane(value: unknown): value is Swimlane {
  return value === "none" || value === "assignee" || value === "priority";
}

function storageKey(orgId: string, projectId: string): string {
  return `elliptic:task-view:${orgId}:${projectId}`;
}

function read(orgId: string, projectId: string): TaskViewPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(storageKey(orgId, projectId));
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Record<keyof TaskViewPrefs, unknown>>;
    return {
      view: isViewMode(parsed.view) ? parsed.view : DEFAULTS.view,
      density: isDensity(parsed.density) ? parsed.density : DEFAULTS.density,
      swimlane: isSwimlane(parsed.swimlane) ? parsed.swimlane : DEFAULTS.swimlane,
    };
  } catch {
    return DEFAULTS;
  }
}

function write(orgId: string, projectId: string, prefs: TaskViewPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(orgId, projectId), JSON.stringify(prefs));
  } catch {
    return;
  }
}

export interface UseTaskViewPrefs extends TaskViewPrefs {
  setView: (view: TaskViewMode) => void;
  toggleView: () => void;
  setDensity: (density: TableDensity) => void;
  setSwimlane: (swimlane: Swimlane) => void;
}

export function useTaskViewPrefs(orgId: string, projectId: string): UseTaskViewPrefs {
  const [prefs, setPrefs] = useState<TaskViewPrefs>(DEFAULTS);

  useEffect(() => {
    setPrefs(read(orgId, projectId));
  }, [orgId, projectId]);

  const update = useCallback(
    (patch: Partial<TaskViewPrefs>) => {
      setPrefs((current) => {
        const next = { ...current, ...patch };
        write(orgId, projectId, next);
        return next;
      });
    },
    [orgId, projectId]
  );

  const setView = useCallback((view: TaskViewMode) => update({ view }), [update]);
  const toggleView = useCallback(
    () => setPrefs((current) => {
      const next = { ...current, view: current.view === "board" ? ("list" as const) : ("board" as const) };
      write(orgId, projectId, next);
      return next;
    }),
    [orgId, projectId]
  );
  const setDensity = useCallback((density: TableDensity) => update({ density }), [update]);
  const setSwimlane = useCallback((swimlane: Swimlane) => update({ swimlane }), [update]);

  return { ...prefs, setView, toggleView, setDensity, setSwimlane };
}
