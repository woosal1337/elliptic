"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Download, ListTodo, Plus, Search } from "lucide-react";
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
} from "@elliptic/ui";
import type { Label, Task, TaskStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER, STATUS_TINT_CLASSES } from "@/lib/task-meta";
import { formatDate, formatRelative } from "@/lib/format";
import { hierarchy } from "@/lib/hierarchy";
import { downloadProjectTasksCsv, useCreateTask, useTasks } from "@/hooks/use-task-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { useShortcut } from "@/lib/keyboard";
import { ErrorState } from "@/components/error-state";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import {
  BlockedBadge,
  BugGlyph,
  PriorityIcon,
  SeverityBadge,
  StatusIcon,
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

/** Compact single-row label chips (up to two, then a +N pill). Hidden on narrow viewports. */
function RowLabels({ labels }: { labels: Label[] }) {
  const shown = labels.slice(0, 2);
  const extra = labels.length - shown.length;
  return (
    <span className="hidden shrink-0 items-center gap-1 lg:flex">
      {shown.map((label) => (
        <span
          key={label.id}
          className="inline-flex h-5 max-w-[9rem] items-center gap-1 rounded-full border border-border bg-surface px-1.5 text-caption text-foreground"
        >
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: label.color }}
          />
          <span className="truncate">{label.name}</span>
        </span>
      ))}
      {extra > 0 ? (
        <span className="inline-flex h-5 items-center rounded-full border border-border bg-surface px-1.5 text-caption text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

/** Inline composer appended to a status group (opened from that group's header "+"). */
function GroupComposer({
  orgId,
  projectId,
  status,
  rowY,
  onClose,
}: {
  orgId: string;
  projectId: string;
  status: TaskStatus;
  rowY: string;
  onClose: () => void;
}) {
  const createTask = useCreateTask(orgId, projectId);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;
    createTask.mutate(
      { title: trimmed, status, priority: "none" },
      {
        onSuccess: () => {
          setTitle("");
          inputRef.current?.focus();
        },
      }
    );
  };

  return (
    <div className={cn("flex items-center px-6", rowY)}>
      <input
        ref={inputRef}
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          } else if (event.key === "Escape") {
            onClose();
          }
        }}
        onBlur={() => {
          if (!title.trim() && !createTask.isPending) onClose();
        }}
        placeholder={`Add task to ${STATUS_LABELS[status]}…`}
        aria-label={`New task in ${STATUS_LABELS[status]}`}
        disabled={createTask.isPending}
        className="w-full bg-transparent text-small text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
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
  const [collapsed, setCollapsed] = useState<ReadonlySet<TaskStatus>>(() => new Set<TaskStatus>());
  const [composing, setComposing] = useState<TaskStatus | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const views = useTaskViews<TableViewConfig>(orgId, projectId, "table");
  const display = useDisplayConfig(orgId, projectId, "table");
  const taskFilters = useTaskFilters();
  const show = display.properties;

  const filterLabels = useMemo(() => collectLabels(tasks.data ?? []), [tasks.data]);

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
  const rowY = compact ? "h-8" : "h-11";

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

  // Linear-style grouping: partition the sorted list into status groups (keeping sort order
  // within each group), dropping empties unless the user opts to see them.
  // Reserve one column width for every identifier on screen, measured from the
  // longest one actually rendered. The font is already monospace and tabular, so
  // digits line up — what did not was the character count: TD-9 is a character
  // shorter than TD-10, and every row shifted the status glyph and title along
  // with it. Measuring beats a fixed guess because project keys differ in length
  // (TD, ATLAS, RAS), and it holds past 999 instead of breaking at the next digit.
  const identifierWidth = useMemo(
    () => filtered.reduce((widest, task) => Math.max(widest, task.identifier.length), 0),
    [filtered]
  );

  const groups = useMemo(() => {
    const byStatus = new Map<TaskStatus, Task[]>();
    for (const status of STATUS_ORDER) byStatus.set(status, []);
    for (const task of ordered) byStatus.get(task.status)?.push(task);
    return STATUS_ORDER.map((status) => ({ status, tasks: byStatus.get(status) ?? [] })).filter(
      (group) => group.tasks.length > 0 || display.showEmptyGroups
    );
  }, [ordered, display.showEmptyGroups]);

  const toggleGroup = useCallback((status: TaskStatus) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  // Keyboard / range selection follows the visible (expanded) grouped order.
  const order = useMemo(
    () =>
      groups
        .filter((group) => !collapsed.has(group.status))
        .flatMap((group) => group.tasks.map((task) => task.id)),
    [groups, collapsed]
  );

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
  const today = new Date().toISOString().slice(0, 10);

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
          <TaskFilterControl filters={taskFilters} labels={filterLabels} />
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
            <Skeleton key={i} className="h-10 w-full" />
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
        <div className="-mx-4 max-h-[calc(100dvh-16rem)] animate-fade-in overflow-auto text-small">
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.status);
            return (
              <section
                key={group.status}
                aria-label={STATUS_LABELS[group.status]}
                className="group/group"
              >
                <div className="sticky top-0 z-10 flex h-10 items-center gap-2 bg-container px-6">
                  {/* The tint is translucent and the header is sticky, so it
                      needs the opaque bg-container above and its own layer
                      here — otherwise rows scrolling underneath show through. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0",
                      STATUS_TINT_CLASSES[group.status]
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.status)}
                    aria-expanded={!isCollapsed}
                    className="relative flex items-center gap-2 rounded text-small font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className={cn(
                        "size-3.5 text-muted-foreground transition-transform duration-150",
                        !isCollapsed && "rotate-90"
                      )}
                    />
                    <StatusIcon status={group.status} />
                    <span>{STATUS_LABELS[group.status]}</span>
                    <span className="text-muted-foreground tabular-nums">{group.tasks.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCollapsed) toggleGroup(group.status);
                      setComposing(group.status);
                    }}
                    aria-label={`Add task to ${STATUS_LABELS[group.status]}`}
                    className="relative ml-auto flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/group:opacity-100"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </div>

                {isCollapsed ? null : (
                  <>
                    {group.tasks.map((task) => {
                      const selected = surface.selection.isSelected(task.id);
                      const focused = surface.selection.isFocused(task.id);
                      const assigneeName = task.assignee_id
                        ? memberName.get(task.assignee_id) ?? "Unknown"
                        : null;
                      const overdue =
                        !!task.due_date &&
                        task.due_date < today &&
                        task.status !== "done" &&
                        task.status !== "cancelled";
                      return (
                        <div
                          key={task.id}
                          role="option"
                          aria-selected={selected}
                          tabIndex={focused ? 0 : -1}
                          data-task-item={task.id}
                          onClick={(event) => surface.onCardSelect(task.id, event)}
                          onDoubleClick={() => surface.setOpenTaskId(task.id)}
                          className={cn(
                            // No hairline between rows: at this density a border
                            // per row reads as a grid. Hover does the separating.
                            "relative flex cursor-pointer items-center gap-2.5 px-6 transition-colors duration-150 hover:bg-muted/50",
                            rowY,
                            selected && "bg-accent/10 hover:bg-accent/15",
                            focused && "outline-none ring-2 ring-inset ring-ring"
                          )}
                        >
                          {show.priority ? <PriorityIcon priority={task.priority} /> : null}
                          {show.identifier ? (
                            <span
                              className={cn(hierarchy.meta, "shrink-0")}
                              style={{ minWidth: `${identifierWidth}ch` }}
                            >
                              {task.identifier}
                            </span>
                          ) : null}
                          {show.status ? <StatusIcon status={task.status} /> : null}
                          {display.showBlocked && task.kind === "bug" ? <BugGlyph /> : null}
                          <span className={cn(hierarchy.headline, "min-w-0 flex-1 truncate font-medium")}>
                            {task.title}
                          </span>
                          {display.showBlocked && task.blocked ? (
                            <BlockedBadge className="shrink-0" />
                          ) : null}
                          {display.showBlocked && task.kind === "bug" && task.severity !== null ? (
                            <span className="hidden shrink-0 sm:inline-flex">
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
                          {show.labels && task.labels.length > 0 ? (
                            <RowLabels labels={task.labels} />
                          ) : null}
                          {show.progress ? <span className="shrink-0">{progressOf(task)}</span> : null}
                          {show.due && task.due_date ? (
                            <span
                              className={cn(
                                "hidden shrink-0 whitespace-nowrap text-caption tabular sm:inline",
                                overdue ? "text-danger" : "text-muted-foreground"
                              )}
                            >
                              <span className="sr-only">Due{overdue ? " (overdue)" : ""}: </span>
                              {formatDate(task.due_date)}
                            </span>
                          ) : null}
                          {show.createdBy ? (
                            <span className="hidden shrink-0 max-w-[9rem] truncate whitespace-nowrap text-caption text-muted-foreground lg:inline">
                              <span className="sr-only">Created by: </span>
                              {memberName.get(task.created_by) ?? "Unknown"}
                            </span>
                          ) : null}
                          {show.updated ? (
                            <span className="hidden shrink-0 whitespace-nowrap text-caption tabular text-muted-foreground md:inline">
                              <span className="sr-only">Updated: </span>
                              {formatRelative(task.updated_at)}
                            </span>
                          ) : null}
                          {show.assignee ? (
                            assigneeName ? (
                              <Avatar
                                name={assigneeName}
                                size="xs"
                                className="shrink-0"
                                aria-label={assigneeName}
                              />
                            ) : (
                              <span
                                aria-label="Unassigned"
                                title="Unassigned"
                                className="size-5 shrink-0 rounded-full border border-dashed border-border"
                              />
                            )
                          ) : null}
                        </div>
                      );
                    })}
                    {composing === group.status ? (
                      <GroupComposer
                        orgId={orgId}
                        projectId={projectId}
                        status={group.status}
                        rowY={rowY}
                        onClose={() => setComposing(null)}
                      />
                    ) : null}
                  </>
                )}
              </section>
            );
          })}
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
