"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, ListTodo, Plus, Search, Tag } from "lucide-react";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  Input,
  ProgressPill,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  cn,
} from "@companyos/ui";
import type { Task } from "@/lib/types";
import { PRIORITY_LABELS, STATUS_LABELS, STATUS_ORDER } from "@/lib/task-meta";
import { formatDate, formatRelative } from "@/lib/format";
import { hierarchy } from "@/lib/hierarchy";
import { downloadProjectTasksCsv, useTasks } from "@/hooks/use-task-queries";
import { useModules } from "@/hooks/use-module-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { useShortcut } from "@/lib/keyboard";
import { ErrorState } from "@/components/error-state";
import { CreateTaskDialog } from "./create-task-dialog";
import { InlineTableAdd } from "./inline-table-add";
import { TaskDetailDialog } from "./task-detail-dialog";
import {
  BlockedBadge,
  BugGlyph,
  PriorityIcon,
  SeverityBadge,
  StatusDot,
  SubtaskProgressPill,
} from "./task-bits";
import { TaskSurfaceOverlays } from "./task-surface-overlays";
import { TaskViewsBar } from "./task-views-bar";
import type { TableDensity } from "./task-view-prefs";
import { useTaskViews, type SavedView, type TableViewConfig } from "./task-views";
import { sortTasksBy, useDisplayConfig } from "./display-config";
import { collectLabels, matchesTaskFilters, useTaskFilters } from "./task-filters";
import { TaskFilterControl } from "./task-filter-control";
import { DisplayOptionsMenu } from "./display-options";
import { taskSubtaskProgress } from "./task-context";
import { rangeToId, selectId, toggleId } from "./use-task-selection";
import { useTaskSurface } from "./use-task-surface";

const ALL = "all";
const UNASSIGNED = "unassigned";

function selectFromClick(taskId: string, event: React.MouseEvent) {
  if (event.shiftKey) {
    rangeToId(taskId);
  } else if (event.metaKey || event.ctrlKey) {
    toggleId(taskId);
  } else {
    selectId(taskId);
  }
}

function progressOf(task: Task) {
  const progress = taskSubtaskProgress(task);
  if (!progress) return null;
  return (
    <ProgressPill value={progress.completed} total={progress.total} size="sm" showBar={false} />
  );
}

export function TasksTable({
  orgId,
  projectId,
  density = "comfortable",
  onDensityChange,
}: {
  orgId: string;
  projectId: string;
  density?: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
}) {
  const tasks = useTasks(orgId, projectId);
  const members = useOrgMembers(orgId);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [query, setQuery] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const views = useTaskViews<TableViewConfig>(orgId, projectId, "table");
  const display = useDisplayConfig(orgId, projectId, "table");
  const taskFilters = useTaskFilters();
  const show = display.properties;

  const filterLabels = useMemo(() => collectLabels(tasks.data ?? []), [tasks.data]);
  const modules = useModules(orgId, projectId);
  const filterModules = useMemo(
    () => (modules.data ?? []).map((module) => ({ id: module.id, name: module.name })),
    [modules.data]
  );

  const currentConfig = useMemo<TableViewConfig>(
    () => ({ surface: "table", density, status: statusFilter, assignee: assigneeFilter, query }),
    [density, statusFilter, assigneeFilter, query]
  );

  const applyView = useCallback(
    (view: SavedView<TableViewConfig>) => {
      setStatusFilter(view.config.status);
      setAssigneeFilter(view.config.assignee);
      setQuery(view.config.query);
      onDensityChange?.(view.config.density);
      setActiveViewId(view.id);
    },
    [onDensityChange]
  );

  const appliedDefault = useRef(false);
  useEffect(() => {
    if (appliedDefault.current) return;
    if (views.defaultView) {
      appliedDefault.current = true;
      applyView(views.defaultView);
    }
  }, [views.defaultView, applyView]);

  const compact = density === "compact";
  const cellY = compact ? "py-1.5" : "py-3";

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    return (tasks.data ?? []).filter((task) => {
      if (statusFilter !== ALL && task.status !== statusFilter) return false;
      if (assigneeFilter === UNASSIGNED && task.assignee_id !== null) return false;
      if (assigneeFilter !== ALL && assigneeFilter !== UNASSIGNED && task.assignee_id !== assigneeFilter)
        return false;
      if (
        normalizedQuery &&
        !task.title.toLowerCase().includes(normalizedQuery) &&
        !task.identifier.toLowerCase().includes(normalizedQuery)
      )
        return false;
      if (!matchesTaskFilters(task, taskFilters.filters)) return false;
      return true;
    });
  }, [tasks.data, statusFilter, assigneeFilter, normalizedQuery, taskFilters.filters]);

  const ordered = useMemo(
    () => sortTasksBy(filtered, display.orderBy),
    [filtered, display.orderBy]
  );

  const order = useMemo(() => ordered.map((task) => task.id), [ordered]);

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of tasks.data ?? []) map.set(task.id, task);
    return map;
  }, [tasks.data]);

  const surface = useTaskSurface(
    orgId,
    projectId,
    order,
    tasksById,
    selectFromClick,
    tasks.isSuccess
  );

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members.data ?? []) {
      map.set(member.user_id, member.full_name);
    }
    return map;
  }, [members.data]);

  const changeStatus = useCallback((value: string) => {
    setStatusFilter(value);
    setActiveViewId(null);
  }, []);
  const changeAssignee = useCallback((value: string) => {
    setAssigneeFilter(value);
    setActiveViewId(null);
  }, []);
  const changeQuery = useCallback((value: string) => {
    setQuery(value);
    setActiveViewId(null);
  }, []);

  useShortcut(
    {
      id: "tasks-table-filter",
      keys: "f",
      label: "Filter tasks",
      scope: "action",
      enabled: tasks.isSuccess && surface.openTaskId === null && surface.picker === null,
    },
    () => filterRef.current?.focus()
  );

  const total = tasks.data?.length ?? 0;
  const showingCount = filtered.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {tasks.isSuccess ? (
            <span className="mr-1 text-small text-muted-foreground">
              {showingCount === total ? `${total} tasks` : `${showingCount} of ${total}`}
            </span>
          ) : null}
          <Input
            ref={filterRef}
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Filter…"
            aria-label="Filter tasks"
            iconLeft={<Search className="size-3.5" />}
            className="h-8 w-44 text-small"
          />
          <Select value={statusFilter} onValueChange={changeStatus}>
            <SelectTrigger className="h-8 w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={changeAssignee}>
            <SelectTrigger className="h-8 w-44" aria-label="Filter by assignee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All assignees</SelectItem>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {(members.data ?? []).map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <TaskFilterControl filters={taskFilters} labels={filterLabels} modules={filterModules} />
          <DisplayOptionsMenu
            config={display}
            surface="table"
            density={onDensityChange ? density : undefined}
            onDensityChange={onDensityChange}
          />
          <IconButton
            aria-label="Export tasks as CSV"
            variant="outline"
            size="sm"
            onClick={() => void downloadProjectTasksCsv(orgId, projectId)}
          >
            <Download className="size-4" />
          </IconButton>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New task
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TaskViewsBar
          store={views}
          activeId={activeViewId}
          current={currentConfig}
          onApply={applyView}
          onClearActive={() => setActiveViewId(null)}
        />
      </div>

      {tasks.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : tasks.isError ? (
        <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ListTodo />}
          title={tasks.data.length === 0 ? "No tasks yet" : "No tasks match the filters"}
          description={
            tasks.data.length === 0
              ? "Create the first task in this project."
              : "Try clearing or changing the filters."
          }
          action={
            tasks.data.length === 0 ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                New task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="max-h-[calc(100dvh-16rem)] overflow-auto rounded-lg border border-border shadow-xs">
          <table className="w-full text-small">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted text-left text-caption uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="w-full px-4 py-2.5 font-medium">Task</th>
                {show.status ? (
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                ) : null}
                {show.priority ? (
                  <th scope="col" className="px-4 py-2.5 font-medium">Priority</th>
                ) : null}
                {show.assignee ? (
                  <th scope="col" className="px-4 py-2.5 font-medium">Assignee</th>
                ) : null}
                {show.labels ? (
                  <th scope="col" className="px-4 py-2.5 font-medium">Labels</th>
                ) : null}
                {show.due ? (
                  <th scope="col" className="px-4 py-2.5 font-medium">Due</th>
                ) : null}
                {show.progress ? (
                  <th scope="col" className="px-4 py-2.5 font-medium">Progress</th>
                ) : null}
                {show.createdBy ? (
                  <th scope="col" className="px-4 py-2.5 font-medium">Created by</th>
                ) : null}
                {show.updated ? (
                  <th scope="col" className="px-4 py-2.5 font-medium">Updated</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {ordered.map((task) => {
                const selected = surface.selection.isSelected(task.id);
                const focused = surface.selection.isFocused(task.id);
                return (
                <tr
                  key={task.id}
                  role="option"
                  aria-selected={selected}
                  tabIndex={focused ? 0 : -1}
                  data-task-item={task.id}
                  onClick={(event) => surface.onCardSelect(task.id, event)}
                  onDoubleClick={() => surface.setOpenTaskId(task.id)}
                  className={cn(
                    "group relative cursor-pointer border-b border-border bg-surface transition-colors duration-150 last:border-b-0 hover:bg-muted/50",
                    selected && "bg-accent/10 hover:bg-accent/15",
                    focused && "outline-none ring-2 ring-inset ring-ring"
                  )}
                >
                  {/* Hover accent bar lives on the first cell, NOT the <tr>: a ::before on a
                      table-row gets wrapped in an anonymous table-cell, adding a phantom leading
                      column that shifts every body cell one column right of the header. */}
                  <td
                    className={cn(
                      "relative w-full px-4",
                      "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent before:opacity-0 before:transition-opacity group-hover:before:opacity-100",
                      cellY
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {show.identifier ? (
                        <span className={cn(hierarchy.meta, "shrink-0")}>{task.identifier}</span>
                      ) : null}
                      {display.showBlocked && task.kind === "bug" ? <BugGlyph /> : null}
                      <span className={cn(hierarchy.headline, "truncate font-medium")}>{task.title}</span>
                      {display.showBlocked && task.blocked ? <BlockedBadge className="shrink-0" /> : null}
                      {display.showBlocked && task.kind === "bug" && task.severity !== null ? (
                        <span className="shrink-0">
                          <SeverityBadge severity={task.severity} />
                        </span>
                      ) : null}
                      {display.showSubtasks && task.subtask_total > 0 ? (
                        <SubtaskProgressPill
                          done={task.subtask_done}
                          total={task.subtask_total}
                          className="shrink-0"
                        />
                      ) : null}
                    </div>
                  </td>
                  {show.status ? (
                    <td className={cn("px-4", cellY)}>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <StatusDot status={task.status} />
                        {STATUS_LABELS[task.status]}
                      </span>
                    </td>
                  ) : null}
                  {show.priority ? (
                    <td className={cn("px-4", cellY)}>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <PriorityIcon priority={task.priority} />
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </td>
                  ) : null}
                  {show.assignee ? (
                    <td className={cn("px-4", cellY)}>
                      {task.assignee_id ? (
                        <span className="flex items-center gap-2 text-foreground">
                          <Avatar name={memberName.get(task.assignee_id) ?? "?"} size="xs" />
                          <span className="truncate">{memberName.get(task.assignee_id) ?? "Unknown"}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                  ) : null}
                  {show.labels ? (
                    <td className={cn("px-4", cellY)}>
                      {(task.labels?.length ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
                          <Tag className="size-3" aria-hidden="true" />
                          {task.labels.length}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ) : null}
                  {show.due ? (
                    <td className={cn("whitespace-nowrap px-4 text-caption text-muted-foreground tabular", cellY)}>
                      {task.due_date ? formatDate(task.due_date) : "—"}
                    </td>
                  ) : null}
                  {show.progress ? (
                    <td className={cn("px-4", cellY)}>
                      {progressOf(task) ?? <span className="text-muted-foreground">—</span>}
                    </td>
                  ) : null}
                  {show.createdBy ? (
                    <td className={cn("whitespace-nowrap px-4 text-caption text-muted-foreground", cellY)}>
                      {memberName.get(task.created_by) ?? "Unknown"}
                    </td>
                  ) : null}
                  {show.updated ? (
                    <td className={cn("whitespace-nowrap px-4 text-caption text-muted-foreground tabular", cellY)}>
                      {formatRelative(task.updated_at)}
                    </td>
                  ) : null}
                </tr>
                );
              })}
              <InlineTableAdd orgId={orgId} projectId={projectId} colSpan={99} />
            </tbody>
          </table>
        </div>
      )}

      <CreateTaskDialog
        orgId={orgId}
        projectId={projectId}
        open={creating}
        onOpenChange={setCreating}
      />
      <TaskDetailDialog
        orgId={orgId}
        projectId={projectId}
        taskId={surface.openTaskId}
        onClose={() => surface.setOpenTaskId(null)}
        onNavigate={(id) => surface.setOpenTaskId(id)}
      />
      <TaskSurfaceOverlays
        orgId={orgId}
        projectId={projectId}
        members={members.data ?? []}
        surface={surface}
      />
    </div>
  );
}
