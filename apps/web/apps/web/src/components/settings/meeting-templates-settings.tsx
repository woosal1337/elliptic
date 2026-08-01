"use client";

import { useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  IconButton,
  Input,
  Label,
  Textarea,
} from "@elliptic/ui";
import {
  useCreateMeetingTemplate,
  useDeleteMeetingTemplate,
  useMeetingTemplates,
  useUpdateMeetingTemplate,
} from "@/hooks/use-meeting-template-queries";
import { BUILTIN_TEMPLATES } from "@/lib/meeting-templates";
import type { MeetingTemplate } from "@/lib/types";

function linesToSections(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function TemplateForm({
  initial,
  pending,
  onCancel,
  onSubmit,
}: {
  initial?: MeetingTemplate;
  pending: boolean;
  onCancel?: () => void;
  onSubmit: (input: { name: string; sections: string[] }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sections, setSections] = useState((initial?.sections ?? []).join("\n"));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim().length === 0) return;
        onSubmit({ name: name.trim(), sections: linesToSections(sections) });
      }}
      className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="template-name">Template name</Label>
        <Input
          id="template-name"
          placeholder="Weekly review"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="template-sections">Sections (one per line, in order)</Label>
        <Textarea
          id="template-sections"
          rows={4}
          placeholder={"Wins\nBlockers\nDecisions\nAction items"}
          value={sections}
          onChange={(event) => setSections(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || name.trim().length === 0}>
          {initial ? "Save changes" : "Create template"}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function CustomTemplateRow({ orgId, template }: { orgId: string; template: MeetingTemplate }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateMeetingTemplate(orgId);
  const remove = useDeleteMeetingTemplate(orgId);

  if (editing) {
    return (
      <TemplateForm
        initial={template}
        pending={update.isPending}
        onCancel={() => setEditing(false)}
        onSubmit={(input) =>
          update.mutate({ id: template.id, ...input }, { onSuccess: () => setEditing(false) })
        }
      />
    );
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-small font-medium text-foreground">{template.name}</span>
        <span className="text-caption text-muted-foreground">
          {template.sections.length > 0 ? template.sections.join(" · ") : "No sections"}
        </span>
      </div>
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <IconButton variant="ghost" aria-label="Edit template" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" />
        </IconButton>
        <IconButton
          variant="ghost"
          aria-label="Delete template"
          disabled={remove.isPending}
          onClick={() => remove.mutate(template.id)}
        >
          <Trash2 className="size-3.5 text-danger" />
        </IconButton>
      </div>
    </div>
  );
}

export function MeetingTemplatesSettings({ orgId }: { orgId: string }) {
  const { customTemplates } = useMeetingTemplates(orgId);
  const create = useCreateMeetingTemplate(orgId);
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting templates</CardTitle>
        <CardDescription>
          Structure templates shape the sections of AI meeting summaries. Built-ins ship with
          Elliptic; add your own and they appear in the summarize picker. Editing a template only
          affects future summaries.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
            Built-in
          </span>
          <div className="flex flex-col gap-1.5">
            {BUILTIN_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
              >
                <Lock className="size-3.5 text-muted-foreground" />
                <span className="text-small text-foreground">{template.name}</span>
                <Badge variant="outline" size="sm" className="ml-auto">
                  {template.sections.length > 0 ? `${template.sections.length} sections` : "Freeform"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
              Custom
            </span>
            {!adding ? (
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                <Plus className="size-4" />
                New template
              </Button>
            ) : null}
          </div>
          {adding ? (
            <TemplateForm
              pending={create.isPending}
              onCancel={() => setAdding(false)}
              onSubmit={(input) =>
                create.mutate(input, { onSuccess: () => setAdding(false) })
              }
            />
          ) : null}
          {customTemplates.length > 0 ? (
            customTemplates.map((template) => (
              <CustomTemplateRow key={template.id} orgId={orgId} template={template} />
            ))
          ) : !adding ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-caption text-muted-foreground">
              No custom templates yet.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
