"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Swimlane, TableDensity } from "./task-view-prefs";

export type TaskSurfaceKind = "board" | "table";

export interface BoardViewConfig {
  surface: "board";
  swimlane: Swimlane;
  status: string;
  assignee: string;
  query: string;
}

export interface TableViewConfig {
  surface: "table";
  density: TableDensity;
  status: string;
  assignee: string;
  query: string;
}

export type ViewConfig = BoardViewConfig | TableViewConfig;

export interface SavedView<TConfig extends ViewConfig = ViewConfig> {
  id: string;
  name: string;
  config: TConfig;
  locked?: boolean;
}

interface ViewsState<TConfig extends ViewConfig> {
  views: SavedView<TConfig>[];
  defaultId: string | null;
}

const EMPTY: ViewsState<ViewConfig> = { views: [], defaultId: null };

function storageKey(orgId: string, projectId: string, surface: TaskSurfaceKind): string {
  return `elliptic:task-views:${surface}:${orgId}:${projectId}`;
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isSavedView(value: unknown): value is SavedView {
  if (typeof value !== "object" || value === null) return false;
  const view = value as Record<string, unknown>;
  return (
    typeof view.id === "string" &&
    typeof view.name === "string" &&
    typeof view.config === "object" &&
    view.config !== null
  );
}

function read<TConfig extends ViewConfig>(
  orgId: string,
  projectId: string,
  surface: TaskSurfaceKind
): ViewsState<TConfig> {
  if (typeof window === "undefined") return EMPTY as ViewsState<TConfig>;
  try {
    const raw = window.localStorage.getItem(storageKey(orgId, projectId, surface));
    if (!raw) return { views: [], defaultId: null };
    const parsed = JSON.parse(raw) as Partial<ViewsState<TConfig>>;
    const views = Array.isArray(parsed.views)
      ? parsed.views.filter(isSavedView).map((view) => view as SavedView<TConfig>)
      : [];
    const defaultId =
      typeof parsed.defaultId === "string" && views.some((view) => view.id === parsed.defaultId)
        ? parsed.defaultId
        : null;
    return { views, defaultId };
  } catch {
    return { views: [], defaultId: null };
  }
}

function write<TConfig extends ViewConfig>(
  orgId: string,
  projectId: string,
  surface: TaskSurfaceKind,
  state: ViewsState<TConfig>
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(orgId, projectId, surface), JSON.stringify(state));
  } catch {
    return;
  }
}

export interface UseTaskViews<TConfig extends ViewConfig> {
  views: SavedView<TConfig>[];
  defaultId: string | null;
  defaultView: SavedView<TConfig> | null;
  saveView: (name: string, config: TConfig) => SavedView<TConfig>;
  updateView: (id: string, config: TConfig) => void;
  renameView: (id: string, name: string) => void;
  deleteView: (id: string) => void;
  setDefault: (id: string | null) => void;
  toggleLock: (id: string) => void;
}

export function useTaskViews<TConfig extends ViewConfig>(
  orgId: string,
  projectId: string,
  surface: TaskSurfaceKind
): UseTaskViews<TConfig> {
  const [state, setState] = useState<ViewsState<TConfig>>(() => ({ views: [], defaultId: null }));

  useEffect(() => {
    setState(read<TConfig>(orgId, projectId, surface));
  }, [orgId, projectId, surface]);

  const saveView = useCallback(
    (name: string, config: TConfig) => {
      const view: SavedView<TConfig> = { id: createId(), name: name.trim() || "Untitled view", config };
      setState((current) => {
        const next = { ...current, views: [...current.views, view] };
        write(orgId, projectId, surface, next);
        return next;
      });
      return view;
    },
    [orgId, projectId, surface]
  );

  const updateView = useCallback(
    (id: string, config: TConfig) =>
      setState((current) => {
        const next = {
          ...current,
          views: current.views.map((view) => (view.id === id ? { ...view, config } : view)),
        };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const renameView = useCallback(
    (id: string, name: string) =>
      setState((current) => {
        const next = {
          ...current,
          views: current.views.map((view) =>
            view.id === id ? { ...view, name: name.trim() || view.name } : view
          ),
        };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const deleteView = useCallback(
    (id: string) =>
      setState((current) => {
        const next = {
          views: current.views.filter((view) => view.id !== id),
          defaultId: current.defaultId === id ? null : current.defaultId,
        };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const setDefault = useCallback(
    (id: string | null) =>
      setState((current) => {
        const next = { ...current, defaultId: id };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const toggleLock = useCallback(
    (id: string) =>
      setState((current) => {
        const next = {
          ...current,
          views: current.views.map((view) =>
            view.id === id ? { ...view, locked: !view.locked } : view
          ),
        };
        write(orgId, projectId, surface, next);
        return next;
      }),
    [orgId, projectId, surface]
  );

  const defaultView = useMemo(
    () => state.views.find((view) => view.id === state.defaultId) ?? null,
    [state.views, state.defaultId]
  );

  return {
    views: state.views,
    defaultId: state.defaultId,
    defaultView,
    saveView,
    updateView,
    renameView,
    deleteView,
    setDefault,
    toggleLock,
  };
}
