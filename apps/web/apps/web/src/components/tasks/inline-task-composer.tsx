"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { IconButton, Spinner, Tooltip, TooltipContent, TooltipTrigger, cn } from "@elliptic/ui";
import type { TaskKind, TaskStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/task-meta";
import { useCreateTask } from "@/hooks/use-task-queries";
import { SegmentedToggle } from "./task-view-toolbar";

const KIND_OPTIONS = [
  { value: "task" as const, label: "Task" },
  { value: "bug" as const, label: "Bug" },
  { value: "story" as const, label: "Story" },
  { value: "epic" as const, label: "Epic" },
];

export interface InlineTaskComposerHandle {
  activate: () => void;
}

export const InlineTaskComposer = forwardRef<
  InlineTaskComposerHandle,
  {
    orgId: string;
    projectId: string;
    status: TaskStatus;
    onAddDetails: () => void;
  }
>(function InlineTaskComposer({ orgId, projectId, status, onAddDetails }, ref) {
  const createTask = useCreateTask(orgId, projectId);
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<TaskKind>("task");
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({ activate: () => setActive(true) }), []);

  useEffect(() => {
    if (active) {
      inputRef.current?.focus();
    }
  }, [active]);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) {
      return;
    }
    createTask.mutate(
      {
        title: trimmed,
        status,
        priority: "none",
        kind,
        severity: kind === "bug" ? "medium" : null,
      },
      {
        onSuccess: () => {
          setTitle("");
          inputRef.current?.focus();
        },
      }
    );
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-caption text-muted-foreground transition-colors duration-150 hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:text-foreground focus-visible:outline-none"
      >
        <Plus className="size-3.5 shrink-0" aria-hidden="true" />
        Add task
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-surface p-3 shadow-xs transition-opacity duration-150",
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
            setKind("task");
            setActive(false);
          }
        }}
        onBlur={(event) => {
          if (event.currentTarget.parentElement?.contains(event.relatedTarget)) {
            return;
          }
          if (!title.trim() && !createTask.isPending) {
            setKind("task");
            setActive(false);
          }
        }}
        placeholder={`New task in ${STATUS_LABELS[status]}`}
        aria-label={`New task title in ${STATUS_LABELS[status]}`}
        disabled={createTask.isPending}
        className="w-full bg-transparent text-small font-medium leading-snug text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                aria-label="Add details"
                size="sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setTitle("");
                  setKind("task");
                  setActive(false);
                  onAddDetails();
                }}
              >
                <SlidersHorizontal />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>Add details</TooltipContent>
          </Tooltip>
          <SegmentedToggle
            ariaLabel="Task type"
            value={kind}
            options={KIND_OPTIONS}
            onChange={setKind}
          />
        </div>
        {createTask.isPending ? (
          <Spinner size="sm" />
        ) : (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={submit}
            disabled={!title.trim()}
            className="rounded-md px-2 py-1 text-caption font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
});
