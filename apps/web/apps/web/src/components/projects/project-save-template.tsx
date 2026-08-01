"use client";

import { useState } from "react";
import { LayoutTemplate, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Skeleton } from "@elliptic/ui";
import {
  useDeleteProjectTemplate,
  useProjectTemplates,
  useSaveProjectTemplate,
} from "@/hooks/use-project-template-queries";

export function ProjectSaveTemplate({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const templates = useProjectTemplates(orgId);
  const save = useSaveProjectTemplate(orgId, projectId);
  const remove = useDeleteProjectTemplate(orgId);
  const [name, setName] = useState("");
  if (!canManage) return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <LayoutTemplate className="size-4 text-muted-foreground" />
          Project templates
        </h2>
        <p className="text-caption text-muted-foreground">
          Save this project&apos;s config (visibility, features, labels, estimate scale, and its
          work items as seed tasks) as a reusable template, then pick it in the create flow.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={name}
          placeholder="Template name (e.g. Backend service)"
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          size="sm"
          disabled={!name.trim() || save.isPending}
          onClick={() => save.mutate({ name: name.trim() }, { onSuccess: () => setName("") })}
        >
          Save as template
        </Button>
      </div>

      {templates.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : (templates.data ?? []).length === 0 ? null : (
        <ul className="flex flex-col gap-1">
          {(templates.data ?? []).map((template) => (
            <li
              key={template.id}
              className="group flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-small"
            >
              <span className="flex-1 truncate text-foreground">{template.name}</span>
              <span className="text-caption text-muted-foreground">
                {template.config.seed_items?.length ?? 0} items
              </span>
              <IconButton
                aria-label={`Delete ${template.name}`}
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => remove.mutate(template.id)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
