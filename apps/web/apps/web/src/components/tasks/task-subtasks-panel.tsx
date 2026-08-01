"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Checkbox, Skeleton, Spinner, cn } from "@elliptic/ui";
import type { Task, TaskStatus } from "@/lib/types";
import { useCreateTask, useSubtasks, useUpdateTask } from "@/hooks/use-task-queries";
import { ErrorState } from "@/components/error-state";
import { StatusDot, SubtaskProgressPill } from "./task-bits";

function SubtaskRow({
  orgId,
  projectId,
  subtask,
  onOpen,
}: {
  orgId: string;
  projectId: string;
  subtask: Task;
  onOpen?: (taskId: string) => void;
}) {
  const updateTask = useUpdateTask(orgId, projectId);
  const done = subtask.status === "done";

  const toggle = (next: boolean) => {
    const status: TaskStatus = next ? "done" : "todo";
    if (status !== subtask.status) {
      updateTask.mutate({ taskId: subtask.id, status });
    }
  };

  const titleClass = cn(
    "min-w-0 flex-1 truncate text-small text-foreground",
    done && "text-muted-foreground line-through"
  );

  return (
    <li className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-surface">
      <Checkbox
        checked={done}
        onCheckedChange={(value) => toggle(value === true)}
        aria-label={`Mark ${subtask.identifier} ${done ? "not done" : "done"}`}
      />
      <StatusDot status={subtask.status} />
      <span className="shrink-0 font-mono text-caption text-muted-foreground">
        {subtask.identifier}
      </span>
      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(subtask.id)}
          className={cn(
            titleClass,
            "text-left transition-colors duration-150 hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          )}
        >
          {subtask.title}
        </button>
      ) : (
        <span className={titleClass}>{subtask.title}</span>
      )}
    </li>
  );
}

function AddSubtask({
  orgId,
  projectId,
  parentTaskId,
}: {
  orgId: string;
  projectId: string;
  parentTaskId: string;
}) {
  const createTask = useCreateTask(orgId, projectId);
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active) {
      inputRef.current?.focus();
    }
  }, [active]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) {
      return;
    }
    createTask.mutate(
      {
        title: trimmed,
        status: "todo",
        priority: "none",
        assignee_id: null,
        parent_task_id: parentTaskId,
      },
      {
        onSuccess: () => {
          setTitle("");
          inputRef.current?.focus();
        },
      }
    );
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-caption text-muted-foreground transition-colors duration-150 hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:text-foreground focus-visible:outline-none"
      >
        <Plus className="size-3.5 shrink-0" aria-hidden="true" />
        Add sub-task
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-input bg-surface px-2.5 py-1.5 shadow-xs transition-opacity duration-150",
        createTask.isPending && "opacity-70"
      )}
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setTitle("");
            setActive(false);
          }
        }}
        onBlur={() => {
          if (!title.trim() && !createTask.isPending) {
            setActive(false);
          }
        }}
        placeholder="New sub-task"
        aria-label="New sub-task title"
        disabled={createTask.isPending}
        className="min-w-0 flex-1 bg-transparent text-small font-medium leading-snug text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      {createTask.isPending ? (
        <Spinner size="sm" />
      ) : (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={submit}
          disabled={!title.trim()}
          className="shrink-0 rounded-md px-2 py-1 text-caption font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
        >
          Add
        </button>
      )}
    </div>
  );
}

export function TaskSubtasksPanel({
  orgId,
  projectId,
  taskId,
  onOpen,
}: {
  orgId: string;
  projectId: string;
  taskId: string;
  onOpen?: (taskId: string) => void;
}) {
  const subtasks = useSubtasks(orgId, taskId);
  const items = subtasks.data ?? [];
  const done = items.filter((subtask) => subtask.status === "done").length;
  const [hideDone, setHideDone] = useState(false);
  const visibleItems = hideDone
    ? items.filter((subtask) => subtask.status !== "done")
    : items;

  return (
    <div className="flex flex-col gap-1.5">
      {items.length > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-mono-label font-mono uppercase tracking-wide text-muted-foreground/70">
            Sub-tasks
          </span>
          <div className="flex items-center gap-2">
            {done > 0 ? (
              <button
                type="button"
                onClick={() => setHideDone((value) => !value)}
                className="text-caption text-muted-foreground transition-colors hover:text-foreground"
              >
                {hideDone ? `Show done (${done})` : "Hide done"}
              </button>
            ) : null}
            <SubtaskProgressPill done={done} total={items.length} />
          </div>
        </div>
      ) : null}
      {subtasks.isPending ? (
        <Skeleton className="h-7 w-full" />
      ) : subtasks.isError ? (
        <ErrorState error={subtasks.error} onRetry={() => void subtasks.refetch()} />
      ) : visibleItems.length > 0 ? (
        <ul className="flex flex-col">
          {visibleItems.map((subtask) => (
            <SubtaskRow
              key={subtask.id}
              orgId={orgId}
              projectId={projectId}
              subtask={subtask}
              onOpen={onOpen}
            />
          ))}
        </ul>
      ) : null}
      <AddSubtask orgId={orgId} projectId={projectId} parentTaskId={taskId} />
    </div>
  );
}
