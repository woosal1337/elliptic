"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ListTodo,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
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
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  PRIORITY_SORT,
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_TINT_CLASSES,
  computeProgress,
  statusCategory,
} from "@/lib/task-meta";
import { formatDate } from "@/lib/format";
import { useTasks, useUpdateTask,
  prefetchTask,
} from "@/hooks/use-task-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { useShortcut } from "@/lib/keyboard";
import { ErrorState } from "@/components/error-state";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { InlineTaskComposer, type InlineTaskComposerHandle } from "./inline-task-composer";
import { LabelStrip } from "./label-strip";
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
import { useTaskViews, type BoardViewConfig, type SavedView } from "./task-views";
import { taskCardContext, taskSubtaskProgress } from "./task-context";
import { rangeToId, selectId, toggleId } from "./use-task-selection";
import { useTaskSurface } from "./use-task-surface";
import { useAvailableHeight } from "./use-available-height";
import { SegmentedToggle } from "./task-view-toolbar";
import { ShortcutTooltip } from "@/components/command/shortcut-tooltip";
import type { Swimlane } from "./task-view-prefs";
import { sortTasksBy, useDisplayConfig, type DisplayConfig } from "./display-config";
import { collectLabels, matchesTaskFilters, useTaskFilters } from "./task-filters";
import { TaskFilterControl } from "./task-filter-control";
import { DisplayOptionsMenu } from "./display-options";

const SWIMLANE_OPTIONS = [
  { value: "none" as const, label: "None" },
  { value: "assignee" as const, label: "Assignee" },
  { value: "priority" as const, label: "Priority" },
];

const ALL = "all";
const UNASSIGNED_FILTER = "unassigned";

const UNASSIGNED_LANE = "__unassigned__";

function CardContextLine({
  task,
  assigneeName,
  show,
  showSubtasks,
  showBlocked,
}: {
  task: Task;
  assigneeName: string | null;
  show: DisplayConfig["properties"];
  showSubtasks: boolean;
  showBlocked: boolean;
}) {
  const progress = show.progress ? taskSubtaskProgress(task) : null;
  const context = taskCardContext(task, assigneeName);
  const dueDate = show.due ? task.due_date : null;
  const subtaskPill = showSubtasks && task.subtask_total > 0;
  const severityBadge = showBlocked && task.kind === "bug" && task.severity !== null;
  const blockedBadge = showBlocked && task.blocked;

  if (
    !progress &&
    !context &&
    !dueDate &&
    !subtaskPill &&
    !severityBadge &&
    !blockedBadge
  )
    return null;

  return (
    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {blockedBadge ? <BlockedBadge /> : null}
      {severityBadge ? <SeverityBadge severity={task.severity!} /> : null}
      {subtaskPill ? (
        <SubtaskProgressPill done={task.subtask_done} total={task.subtask_total} />
      ) : null}
      {progress ? (
        <ProgressPill
          value={progress.completed}
          total={progress.total}
          size="sm"
          showBar={false}
        />
      ) : null}
      {context ? (
        <span className="line-clamp-1 min-w-0 flex-1 text-caption text-muted-foreground">
          {context}
        </span>
      ) : null}
      {!context && dueDate ? (
        <span className="text-caption text-muted-foreground tabular">{formatDate(dueDate)}</span>
      ) : null}
    </div>
  );
}

function BoardCard({
  task,
  assigneeName,
  selected,
  focused,
  show,
  showSubtasks,
  showBlocked,
  onOpen,
  onMove,
  onSelect,
}: {
  task: Task;
  assigneeName: string | null;
  selected: boolean;
  focused: boolean;
  show: DisplayConfig["properties"];
  showSubtasks: boolean;
  showBlocked: boolean;
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
  onSelect: (event: React.MouseEvent) => void;
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      role="option"
      aria-selected={selected}
      tabIndex={focused ? 0 : -1}
      data-task-item={task.id}
      onClick={onSelect}
      {...listeners}
      className={cn(
        "group relative cursor-grab touch-none select-none rounded-md border bg-surface p-3 shadow-xs transition-[border-color,box-shadow] duration-150 ease-out hover:border-input hover:shadow-sm active:cursor-grabbing",
        selected ? "border-accent ring-1 ring-accent/40" : "border-border",
        focused && "outline-none ring-2 ring-ring ring-offset-2 ring-offset-background",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="min-w-0 flex-1 text-left focus-visible:outline-none"
        >
          {show.identifier ? (
            <p className="font-mono text-caption text-muted-foreground">{task.identifier}</p>
          ) : null}
          <p className={cn("line-clamp-3 text-small font-medium leading-snug text-foreground", show.identifier && "mt-1")}>
            {showBlocked && task.kind === "bug" ? (
              <BugGlyph className="-mb-0.5 mr-1 inline-block" />
            ) : null}
            {task.title}
          </p>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              aria-label={`Move ${task.identifier}`}
              size="sm"
              onClick={(event) => event.stopPropagation()}
              className="-mr-1 -mt-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {STATUS_ORDER.filter((status) => status !== task.status).map((status) => (
              <DropdownMenuItem key={status} onSelect={() => onMove(status)}>
                <StatusDot status={status} />
                {STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {task.labels.length > 0 ? <LabelStrip labels={task.labels} maxRows={2} /> : null}
      <CardContextLine
        task={task}
        assigneeName={assigneeName}
        show={show}
        showSubtasks={showSubtasks}
        showBlocked={showBlocked}
      />
      {show.priority || show.assignee ? (
        <div className="mt-3 flex items-center justify-between">
          {show.priority ? <PriorityIcon priority={task.priority} /> : <span aria-hidden="true" />}
          {show.assignee ? (
            task.assignee_id ? (
              <Avatar name={assigneeName ?? "?"} size="xs" />
            ) : (
              <span className="size-5 rounded-full border border-dashed border-border" aria-hidden="true" />
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BoardDragCard({ task, show }: { task: Task; show: DisplayConfig["properties"] }) {
  return (
    <div className="w-72 rotate-1 cursor-grabbing rounded-md border border-accent/60 bg-surface p-3 shadow-xl">
      {show.identifier ? (
        <p className="font-mono text-caption text-muted-foreground">{task.identifier}</p>
      ) : null}
      <p
        className={cn(
          "line-clamp-3 text-small font-medium leading-snug text-foreground",
          show.identifier && "mt-1"
        )}
      >
        {task.title}
      </p>
    </div>
  );
}

function BoardColumn({
  orgId,
  projectId,
  status,
  tasks,
  memberName,
  laneKey,
  show,
  showSubtasks,
  showBlocked,
  isSelected,
  isFocused,
  onOpen,
  onMove,
  onSelect,
  onAddDetails,
}: {
  orgId: string;
  projectId: string;
  status: TaskStatus;
  tasks: Task[];
  memberName: Map<string, string>;
  laneKey?: string;
  show: DisplayConfig["properties"];
  showSubtasks: boolean;
  showBlocked: boolean;
  isSelected: (id: string) => boolean;
  isFocused: (id: string) => boolean;
  onOpen: (taskId: string) => void;
  onMove: (taskId: string, status: TaskStatus) => void;
  onSelect: (taskId: string, event: React.MouseEvent) => void;
  onAddDetails: (status: TaskStatus) => void;
}) {
  const composerRef = useRef<InlineTaskComposerHandle>(null);
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `${laneKey ?? "_"}::${status}`,
  });

  return (
    <section
      aria-label={STATUS_LABELS[status]}
      className="flex w-[348px] shrink-0 flex-col overflow-hidden rounded-md"
    >
      <div
        className={cn(
          "flex h-[50px] items-center justify-between gap-2 px-3",
          STATUS_TINT_CLASSES[status]
        )}
      >
        <div className="flex items-center gap-2">
          <StatusDot status={status} title={CATEGORY_LABELS[statusCategory(status)]} />
          <h3 className="text-small font-semibold text-foreground">{STATUS_LABELS[status]}</h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-subtle px-1.5 text-caption font-medium text-muted-foreground tabular">
            {tasks.length}
          </span>
        </div>
        {laneKey === undefined ? (
          <ShortcutTooltip label={`New task in ${STATUS_LABELS[status]}`} keys="c">
            <IconButton
              aria-label={`New task in ${STATUS_LABELS[status]}`}
              size="sm"
              onClick={() => composerRef.current?.activate()}
            >
              <Plus />
            </IconButton>
          </ShortcutTooltip>
        ) : null}
      </div>
      <div
        ref={setDropRef}
        role="listbox"
        aria-label={`${STATUS_LABELS[status]} tasks`}
        aria-multiselectable="true"
        className={cn(
          // Fills the height the row allows and scrolls its own cards, so one
          // long column can't stretch the board past the fold.
          // Hangs directly off the tinted header — the column reads as one
          // surface rather than a label floating above a box.
          "flex min-h-28 flex-1 flex-col gap-2 overflow-y-auto bg-muted/40 p-2 transition-colors duration-150",
          isOver && "bg-accent/5"
        )}
      >
        {tasks.map((task) => (
          <BoardCard
            key={task.id}
            task={task}
            assigneeName={task.assignee_id ? memberName.get(task.assignee_id) ?? null : null}
            selected={isSelected(task.id)}
            focused={isFocused(task.id)}
            show={show}
            showSubtasks={showSubtasks}
            showBlocked={showBlocked}
            onOpen={() => onOpen(task.id)}
            onMove={(next) => onMove(task.id, next)}
            onSelect={(event) => onSelect(task.id, event)}
          />
        ))}
        {laneKey === undefined ? (
          <InlineTaskComposer
            ref={composerRef}
            orgId={orgId}
            projectId={projectId}
            status={status}
            onAddDetails={() => onAddDetails(status)}
          />
        ) : null}
      </div>
    </section>
  );
}

interface LaneGroup {
  key: string;
  label: string;
  count: number;
}

function selectFromClick(taskId: string, event: React.MouseEvent) {
  if (event.shiftKey) {
    rangeToId(taskId);
  } else if (event.metaKey || event.ctrlKey) {
    toggleId(taskId);
  } else {
    selectId(taskId);
  }
}

export function Board({
  orgId,
  projectId,
  swimlane = "none",
}: {
  orgId: string;
  projectId: string;
  swimlane?: Swimlane;
}) {
  const queryClient = useQueryClient();
  const tasks = useTasks(orgId, projectId);
  const members = useOrgMembers(orgId);
  const updateTask = useUpdateTask(orgId, projectId);
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(() => new Set());

  const [swimlaneOverride, setSwimlaneOverride] = useState<Swimlane | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [query, setQuery] = useState<string>("");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  // 32px gutter = the page's bottom padding, the only thing under the board.
  const columnsHeight = useAvailableHeight(columnsRef, { gutter: 32 });

  const effectiveSwimlane = swimlaneOverride ?? swimlane;

  const views = useTaskViews<BoardViewConfig>(orgId, projectId, "board");
  const display = useDisplayConfig(orgId, projectId, "board");
  const taskFilters = useTaskFilters();
  const show = display.properties;

  const filterLabels = useMemo(() => collectLabels(tasks.data ?? []), [tasks.data]);

  const currentConfig = useMemo<BoardViewConfig>(
    () => ({
      surface: "board",
      swimlane: effectiveSwimlane,
      status: statusFilter,
      assignee: assigneeFilter,
      query,
    }),
    [effectiveSwimlane, statusFilter, assigneeFilter, query]
  );

  const applyView = useCallback((view: SavedView<BoardViewConfig>) => {
    setSwimlaneOverride(view.config.swimlane);
    setStatusFilter(view.config.status);
    setAssigneeFilter(view.config.assignee);
    setQuery(view.config.query);
    setActiveViewId(view.id);
  }, []);

  const appliedDefault = useRef(false);
  useEffect(() => {
    if (appliedDefault.current) return;
    if (views.defaultView) {
      appliedDefault.current = true;
      applyView(views.defaultView);
    }
  }, [views.defaultView, applyView]);

  const memberName = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members.data ?? []) {
      map.set(member.user_id, member.full_name);
    }
    return map;
  }, [members.data]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleTasks = useMemo(() => {
    return (tasks.data ?? []).filter((task) => {
      if (statusFilter !== ALL && task.status !== statusFilter) return false;
      if (assigneeFilter === UNASSIGNED_FILTER && task.assignee_id !== null) return false;
      if (
        assigneeFilter !== ALL &&
        assigneeFilter !== UNASSIGNED_FILTER &&
        task.assignee_id !== assigneeFilter
      )
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

  const orderedTasks = useMemo(
    () => sortTasksBy(visibleTasks, display.orderBy),
    [visibleTasks, display.orderBy]
  );

  const laneOf = useMemo(
    () =>
      (task: Task): string => {
        if (effectiveSwimlane === "assignee") return task.assignee_id ?? UNASSIGNED_LANE;
        if (effectiveSwimlane === "priority") return task.priority;
        return "";
      },
    [effectiveSwimlane]
  );

  const lanes = useMemo<LaneGroup[]>(() => {
    if (effectiveSwimlane === "none") return [];
    const counts = new Map<string, number>();
    for (const task of visibleTasks) {
      const key = laneOf(task);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (effectiveSwimlane === "priority") {
      return PRIORITY_SORT.filter((priority) => counts.has(priority)).map((priority) => ({
        key: priority,
        label: PRIORITY_LABELS[priority as TaskPriority],
        count: counts.get(priority) ?? 0,
      }));
    }
    const out: LaneGroup[] = [];
    for (const member of members.data ?? []) {
      if (counts.has(member.user_id)) {
        out.push({
          key: member.user_id,
          label: member.full_name,
          count: counts.get(member.user_id) ?? 0,
        });
      }
    }
    if (counts.has(UNASSIGNED_LANE)) {
      out.push({
        key: UNASSIGNED_LANE,
        label: "Unassigned",
        count: counts.get(UNASSIGNED_LANE) ?? 0,
      });
    }
    return out;
  }, [effectiveSwimlane, visibleTasks, members.data, laneOf]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<TaskStatus, Task[]>>();
    const ensure = (laneKey: string) => {
      let lane = map.get(laneKey);
      if (!lane) {
        lane = new Map<TaskStatus, Task[]>(STATUS_ORDER.map((status) => [status, []]));
        map.set(laneKey, lane);
      }
      return lane;
    };
    ensure("");
    for (const task of orderedTasks) {
      const lane = ensure(effectiveSwimlane === "none" ? "" : laneOf(task));
      lane.get(task.status)?.push(task);
    }
    return map;
  }, [orderedTasks, effectiveSwimlane, laneOf]);

  const order = useMemo(() => {
    const ids: string[] = [];
    const laneKeys = effectiveSwimlane === "none" ? [""] : lanes.map((lane) => lane.key);
    for (const laneKey of laneKeys) {
      const lane = grouped.get(laneKey);
      if (!lane) continue;
      for (const status of STATUS_ORDER) {
        for (const task of lane.get(status) ?? []) ids.push(task.id);
      }
    }
    return ids;
  }, [grouped, effectiveSwimlane, lanes]);

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const activeDragTask = activeDragId ? tasksById.get(activeDragId) ?? null : null;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) return;
      const task = tasksById.get(String(active.id));
      if (!task) return;
      const overId = String(over.id);
      const sep = overId.indexOf("::");
      if (sep === -1) return;
      const laneKeyRaw = overId.slice(0, sep);
      const targetStatus = overId.slice(sep + 2) as TaskStatus;
      const patch: {
        taskId: string;
        status?: TaskStatus;
        assignee_id?: string | null;
        priority?: TaskPriority;
      } = { taskId: task.id };
      if (targetStatus && targetStatus !== task.status) patch.status = targetStatus;
      if (effectiveSwimlane === "assignee") {
        const target = laneKeyRaw === UNASSIGNED_LANE ? null : laneKeyRaw;
        if ((task.assignee_id ?? null) !== target) patch.assignee_id = target;
      } else if (effectiveSwimlane === "priority") {
        const target = laneKeyRaw as TaskPriority;
        if (target && target !== task.priority) patch.priority = target;
      }
      if (patch.status === undefined && !("assignee_id" in patch) && patch.priority === undefined) {
        return;
      }
      updateTask.mutate(patch);
    },
    [tasksById, effectiveSwimlane, updateTask]
  );

  useShortcut(
    {
      id: "tasks-create",
      keys: "c",
      label: "Create task",
      scope: "action",
      enabled: !surface.openTaskId,
    },
    () => {
      const selected = window.getSelection()?.toString().trim() ?? "";
      setCreateStatus(null);
      setCreateTitle(selected);
      setCreateOpen(true);
    }
  );

  useShortcut(
    {
      id: "board-toggle-lanes",
      keys: "t",
      label: "Collapse/expand swimlanes",
      scope: "action",
      enabled: effectiveSwimlane !== "none" && !surface.openTaskId,
    },
    () =>
      setCollapsedLanes((current) => {
        if (current.size > 0) return new Set();
        return new Set(lanes.map((lane) => lane.key));
      })
  );

  useShortcut(
    {
      id: "board-filter",
      keys: "f",
      label: "Filter tasks",
      scope: "action",
      enabled: tasks.isSuccess && !surface.openTaskId && surface.picker === null,
    },
    () => filterRef.current?.focus()
  );

  const changeSwimlane = useCallback((value: Swimlane) => {
    setSwimlaneOverride(value);
    setActiveViewId(null);
  }, []);
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

  const progress = useMemo(
    () => computeProgress((tasks.data ?? []).map((task) => task.status)),
    [tasks.data]
  );

  if (tasks.isPending) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="w-[348px] shrink-0">
            <Skeleton className="mb-3 h-6 w-28" />
            <Skeleton className="mb-2 h-24 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.isError) {
    return <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />;
  }

  const renderColumns = (laneKey: string | undefined) => {
    const laneTasks = grouped.get(laneKey ?? "") ?? new Map<TaskStatus, Task[]>();
    const statuses = display.showEmptyGroups
      ? STATUS_ORDER
      : STATUS_ORDER.filter((status) => (laneTasks.get(status)?.length ?? 0) > 0);
    const inLane = laneKey !== undefined;
    return (
      <div
        ref={inLane ? undefined : columnsRef}
        // One listener for every card. The pointer reaching a card is the
        // earliest honest signal that the reader may open it, so the detail and
        // the comments start loading then rather than on the click.
        onPointerOver={(event) => {
          const card = (event.target as HTMLElement).closest("[data-task-item]");
          const id = card?.getAttribute("data-task-item");
          if (id) prefetchTask(queryClient, orgId, id);
        }}
        className={cn(
          "flex animate-fade-in gap-4 overflow-x-auto pb-4",
          // Ungrouped: the inline style below caps the row at the fold, and this
          // is only the pre-measurement guess. Grouped: lanes stack, so each one
          // caps lower and the page scrolls between lanes.
          inLane ? "max-h-[60dvh]" : "max-h-[calc(100dvh-20rem)]"
        )}
        style={inLane ? undefined : { maxHeight: columnsHeight ?? undefined }}
      >
        {statuses.map((status) => (
          <BoardColumn
            key={status}
            orgId={orgId}
            projectId={projectId}
            status={status}
            laneKey={laneKey}
            tasks={laneTasks.get(status) ?? []}
            memberName={memberName}
            show={show}
            showSubtasks={display.showSubtasks}
            showBlocked={display.showBlocked}
            isSelected={surface.selection.isSelected}
            isFocused={surface.selection.isFocused}
            onOpen={surface.setOpenTaskId}
            onMove={(taskId, next) => updateTask.mutate({ taskId, status: next })}
            onSelect={surface.onCardSelect}
            onAddDetails={(addStatus) => {
              setCreateStatus(addStatus);
              setCreateTitle("");
              setCreateOpen(true);
            }}
          />
        ))}
        {statuses.length === 0 ? (
          <div className="w-full py-10">
            <EmptyState
              icon={<ListTodo />}
              title={(tasks.data ?? []).length === 0 ? "No tasks yet" : "No tasks match the filters"}
              description={
                (tasks.data ?? []).length === 0
                  ? "Create the first task in this project."
                  : "Try clearing or changing the filters."
              }
              action={
                (tasks.data ?? []).length === 0 ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreateStatus(null);
                      setCreateTitle("");
                      setCreateOpen(true);
                    }}
                  >
                    <Plus className="size-4" />
                    New task
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-mono-label text-muted-foreground">Progress</span>
          <div
            className="h-1.5 w-28 overflow-hidden rounded-full bg-subtle"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-label="Project completion"
          >
            <div
              className="h-full rounded-full bg-success transition-[width] duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="text-caption font-medium tabular text-foreground">
            {progress.percent}%
          </span>
          <span className="text-caption tabular text-muted-foreground">
            {progress.completed}/{progress.total}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={filterRef}
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Filter…"
            aria-label="Filter tasks"
            iconLeft={<Search className="size-3.5" />}
            className="h-8 w-40 text-small"
          />
          <Select value={statusFilter} onValueChange={changeStatus}>
            <SelectTrigger className="h-8 w-36" aria-label="Filter by status">
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
            <SelectTrigger className="h-8 w-40" aria-label="Filter by assignee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All assignees</SelectItem>
              <SelectItem value={UNASSIGNED_FILTER}>Unassigned</SelectItem>
              {(members.data ?? []).map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SegmentedToggle
            ariaLabel="Group by"
            value={effectiveSwimlane}
            options={SWIMLANE_OPTIONS}
            onChange={changeSwimlane}
          />
          <TaskFilterControl filters={taskFilters} labels={filterLabels} />
          <DisplayOptionsMenu config={display} surface="board" hiddenProperties={["createdBy"]} />
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 px-0.5">
        <TaskViewsBar
          store={views}
          activeId={activeViewId}
          current={currentConfig}
          onApply={applyView}
          onClearActive={() => setActiveViewId(null)}
        />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event) => setActiveDragId(String(event.active.id))}
        onDragCancel={() => setActiveDragId(null)}
        onDragEnd={handleDragEnd}
      >
      {effectiveSwimlane === "none" ? (
        renderColumns(undefined)
      ) : (
        <div className="flex flex-col gap-4">
          {lanes.map((lane) => {
            const collapsed = collapsedLanes.has(lane.key);
            return (
              <Fragment key={lane.key}>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedLanes((current) => {
                        const next = new Set(current);
                        if (next.has(lane.key)) next.delete(lane.key);
                        else next.add(lane.key);
                        return next;
                      })
                    }
                    className="flex w-fit items-center gap-1.5 rounded px-0.5 text-small font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {collapsed ? (
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span>{lane.label}</span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-subtle px-1.5 text-caption font-medium text-muted-foreground tabular">
                      {lane.count}
                    </span>
                  </button>
                  {collapsed ? null : renderColumns(lane.key)}
                </div>
              </Fragment>
            );
          })}
          {lanes.length === 0 ? (
            <p className="px-0.5 text-small text-muted-foreground">No tasks to group.</p>
          ) : null}
        </div>
      )}
        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {activeDragTask ? (
            <BoardDragCard task={activeDragTask} show={display.properties} />
          ) : null}
        </DragOverlay>
      </DndContext>
      {createOpen ? (
        <CreateTaskDialog
          orgId={orgId}
          projectId={projectId}
          open
          onOpenChange={(open) => {
            if (!open) {
              setCreateOpen(false);
              setCreateStatus(null);
              setCreateTitle("");
            }
          }}
          defaultStatus={createStatus ?? "todo"}
          defaultTitle={createTitle}
        />
      ) : null}
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
    </>
  );
}
