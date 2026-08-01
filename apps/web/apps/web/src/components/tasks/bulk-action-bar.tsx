"use client";

import { useState } from "react";
import { Ban, Check, Flag, Trash2, UserRound, X } from "lucide-react";
import { Button, IconButton, cn } from "@elliptic/ui";
import type { OrgMember, TaskPriority, TaskStatus } from "@/lib/types";
import { useDeleteTask, useUpdateTask } from "@/hooks/use-task-queries";
import { AssigneePicker, PriorityPicker, StatusPicker } from "./task-property-picker";

type OpenPicker = "status" | "priority" | "assignee" | null;

export function BulkActionBar({
  orgId,
  projectId,
  selectedIds,
  members,
  onClear,
}: {
  orgId: string;
  projectId: string;
  selectedIds: string[];
  members: OrgMember[];
  onClear: () => void;
}) {
  const updateTask = useUpdateTask(orgId, projectId);
  const deleteTask = useDeleteTask(orgId, projectId);
  const [picker, setPicker] = useState<OpenPicker>(null);

  if (selectedIds.length === 0) return null;

  const count = selectedIds.length;

  const removeSelected = () => {
    if (!window.confirm(`Delete ${count} ${count === 1 ? "task" : "tasks"}? This cannot be undone.`)) {
      return;
    }
    for (const taskId of selectedIds) deleteTask.mutate(taskId);
    onClear();
  };

  const applyStatus = (status: TaskStatus) => {
    for (const taskId of selectedIds) updateTask.mutate({ taskId, status });
    setPicker(null);
  };

  const applyPriority = (priority: TaskPriority) => {
    for (const taskId of selectedIds) updateTask.mutate({ taskId, priority });
    setPicker(null);
  };

  const applyAssignee = (userId: string | null) => {
    for (const taskId of selectedIds) updateTask.mutate({ taskId, assignee_id: userId });
    setPicker(null);
  };

  const archive = () => {
    for (const taskId of selectedIds) updateTask.mutate({ taskId, status: "cancelled" });
    onClear();
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        <div
          role="toolbar"
          aria-label={`${count} selected`}
          className={cn(
            "pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-surface/95 p-1.5 shadow-xl backdrop-blur-sm",
            "data-[state=open]:animate-content-in"
          )}
          data-state="open"
        >
          <div className="flex items-center gap-2 pl-2 pr-1">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-caption font-semibold tabular-nums text-accent-foreground">
              {count}
            </span>
            <span className="text-small text-muted-foreground">selected</span>
          </div>
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPicker("status")}
            aria-haspopup="dialog"
          >
            <Check className="size-4" />
            Status
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPicker("priority")}
            aria-haspopup="dialog"
          >
            <Flag className="size-4" />
            Priority
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPicker("assignee")}
            aria-haspopup="dialog"
          >
            <UserRound className="size-4" />
            Assign
          </Button>
          <Button size="sm" variant="ghost" onClick={archive}>
            <Ban className="size-4" />
            Archive
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={removeSelected}
            className="text-danger hover:text-danger"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
          <div className="flex items-center pl-0.5 pr-1">
            <IconButton size="sm" aria-label="Clear selection" onClick={onClear}>
              <X />
            </IconButton>
          </div>
        </div>
      </div>

      <StatusPicker
        kind="status"
        open={picker === "status"}
        current={null}
        count={count}
        onSelect={applyStatus}
        onClose={() => setPicker(null)}
      />
      <PriorityPicker
        kind="priority"
        open={picker === "priority"}
        current={null}
        count={count}
        onSelect={applyPriority}
        onClose={() => setPicker(null)}
      />
      <AssigneePicker
        kind="assignee"
        open={picker === "assignee"}
        current={null}
        count={count}
        members={members}
        onSelect={applyAssignee}
        onClose={() => setPicker(null)}
      />
    </>
  );
}
