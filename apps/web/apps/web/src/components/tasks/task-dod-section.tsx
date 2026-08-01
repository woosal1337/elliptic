"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Checkbox, IconButton, Input, Textarea } from "@elliptic/ui";
import type { DodItem, Task } from "@/lib/types";
import { useUpdateTask } from "@/hooks/use-task-queries";

export function TaskDodSection({
  orgId,
  projectId,
  task,
}: {
  orgId: string;
  projectId: string;
  task: Task;
}) {
  const updateTask = useUpdateTask(orgId, projectId);
  const [newItem, setNewItem] = useState("");
  const [criteria, setCriteria] = useState(task.acceptance_criteria ?? "");

  const items = task.dod_items ?? [];
  const doneCount = items.filter((item) => item.done).length;

  const saveItems = (next: DodItem[]) => {
    updateTask.mutate({ taskId: task.id, dod_items: next });
  };

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    saveItems([...items, { text, done: false }]);
    setNewItem("");
  };

  const toggle = (index: number) => {
    saveItems(items.map((item, i) => (i === index ? { ...item, done: !item.done } : item)));
  };

  const remove = (index: number) => {
    saveItems(items.filter((_, i) => i !== index));
  };

  return (
    <section className="flex flex-col gap-2">
      {items.length > 0 ? (
        <div className="flex items-center justify-between">
          <span className="text-caption text-muted-foreground">
            {doneCount}/{items.length} done
          </span>
        </div>
      ) : null}

      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={index} className="group flex items-center gap-2">
            <Checkbox
              checked={item.done}
              onCheckedChange={() => toggle(index)}
              aria-label={item.text}
            />
            <span
              className={`min-w-0 flex-1 truncate text-small ${
                item.done ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {item.text}
            </span>
            <IconButton
              aria-label={`Remove ${item.text}`}
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => remove(index)}
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-1.5">
        <Input
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="Add a done criterion…"
          aria-label="New checklist item"
          className="h-8"
        />
        <IconButton aria-label="Add item" variant="ghost" size="sm" onClick={addItem}>
          <Plus className="size-4" />
        </IconButton>
      </div>

      <div className="mt-1 flex flex-col gap-1">
        <span className="text-caption text-muted-foreground">Acceptance criteria</span>
        <Textarea
          value={criteria}
          onChange={(event) => setCriteria(event.target.value)}
          onBlur={() => {
            if (criteria !== (task.acceptance_criteria ?? "")) {
              updateTask.mutate({ taskId: task.id, acceptance_criteria: criteria || null });
            }
          }}
          placeholder="Given… when… then…"
          rows={2}
          aria-label="Acceptance criteria"
        />
      </div>
    </section>
  );
}
