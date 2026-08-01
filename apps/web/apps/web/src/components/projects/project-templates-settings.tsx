"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, IconButton, Input, Skeleton, Textarea } from "@elliptic/ui";
import type { TaskKind, TaskPriority } from "@/lib/types";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
} from "@/hooks/use-template-queries";
import { ErrorState } from "@/components/error-state";
import { PrioritySelect } from "@/components/tasks/task-bits";

const KINDS: TaskKind[] = ["task", "bug", "story", "epic"];

export function ProjectTemplatesSettings({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const templates = useTemplates(orgId, projectId);
  const createTemplate = useCreateTemplate(orgId, projectId);
  const deleteTemplate = useDeleteTemplate(orgId, projectId);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("none");
  const [kind, setKind] = useState<TaskKind>("task");

  const submit = () => {
    if (!name.trim() || !title.trim()) return;
    createTemplate.mutate(
      {
        name: name.trim(),
        title: title.trim(),
        description: description.trim() || null,
        priority,
        kind,
      },
      {
        onSuccess: () => {
          setName("");
          setTitle("");
          setDescription("");
          setPriority("none");
          setKind("task");
        },
      }
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Work item templates</h2>
        <p className="text-caption text-muted-foreground">
          Reusable scaffolds offered in the new-work-item dialog.
        </p>
      </div>

      {templates.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : templates.isError ? (
        <ErrorState error={templates.error} onRetry={() => void templates.refetch()} />
      ) : (templates.data ?? []).length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {(templates.data ?? []).map((template) => (
            <li
              key={template.id}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-small text-foreground">
                {template.name}
              </span>
              <Badge variant="outline">{template.kind}</Badge>
              {canManage ? (
                <IconButton
                  aria-label={`Delete ${template.name}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTemplate.mutate(template.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canManage ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2.5">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Template name (e.g. Bug report)"
            aria-label="Template name"
          />
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Prefilled title"
            aria-label="Prefilled title"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Prefilled description (optional)"
            rows={2}
            aria-label="Prefilled description"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-36 flex-1">
              <PrioritySelect value={priority} onChange={setPriority} />
            </div>
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
              {KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  className={`rounded px-2 py-0.5 text-caption capitalize transition-colors ${
                    kind === value
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={submit}
              loading={createTemplate.isPending}
              disabled={name.trim().length === 0 || title.trim().length === 0}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
