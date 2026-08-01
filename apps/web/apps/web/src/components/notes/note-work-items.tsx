"use client";

import { ListChecks, Plus } from "lucide-react";
import { Button, Skeleton } from "@elliptic/ui";
import { StatusDot } from "@/components/tasks/task-bits";
import { useNoteTasks } from "@/hooks/use-note-task-queries";
import { useCreateTask } from "@/hooks/use-task-queries";

export function NoteWorkItems({
  orgId,
  noteId,
  projectId,
}: {
  orgId: string;
  noteId: string;
  projectId: string | null;
}) {
  const tasks = useNoteTasks(orgId, noteId);
  const createTask = useCreateTask(orgId, projectId ?? "");

  const createFromSelection = () => {
    if (!projectId) return;
    const selected = window.getSelection()?.toString().trim();
    if (!selected) return;
    createTask.mutate({
      title: selected.slice(0, 280),
      status: "todo",
      priority: "none",
      source_note_id: noteId,
    });
  };

  const rows = tasks.data ?? [];

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          <ListChecks className="size-3.5" />
          Work items
        </h3>
      </div>

      {projectId ? (
        <Button size="sm" variant="outline" onClick={createFromSelection} loading={createTask.isPending}>
          <Plus className="size-3.5" />
          Create from selection
        </Button>
      ) : (
        <p className="text-caption text-muted-foreground/70">
          Move this page into a project to create linked work items.
        </p>
      )}

      {tasks.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-caption text-muted-foreground/70">No linked work items yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-caption"
            >
              <StatusDot status={task.status} />
              <span className="shrink-0 font-mono text-muted-foreground">{task.identifier}</span>
              <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
