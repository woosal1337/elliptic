"use client";

import { useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Skeleton, Textarea } from "@elliptic/ui";
import { formatDate } from "@/lib/format";
import {
  type Retrospective,
  useCreateRetrospective,
  useDeleteRetrospective,
  useRetrospectives,
  useUpdateRetrospective,
} from "@/hooks/use-retrospective-queries";

function RetroCard({
  orgId,
  projectId,
  retro,
}: {
  orgId: string;
  projectId: string;
  retro: Retrospective;
}) {
  const update = useUpdateRetrospective(orgId, projectId);
  const remove = useDeleteRetrospective(orgId, projectId);

  const field = (
    label: string,
    value: string | null,
    key: "went_well" | "to_improve" | "action_items"
  ) => (
    <div className="flex flex-col gap-1">
      <span className="text-caption font-medium text-muted-foreground">{label}</span>
      <Textarea
        defaultValue={value ?? ""}
        placeholder="…"
        className="min-h-[3rem] text-small"
        onBlur={(event) => {
          if (event.target.value !== (value ?? "")) {
            update.mutate({ retroId: retro.id, [key]: event.target.value });
          }
        }}
      />
    </div>
  );

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-small font-semibold text-foreground">{retro.title}</span>
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted-foreground">{formatDate(retro.created_at)}</span>
          <IconButton aria-label="Delete retro" variant="ghost" size="sm" onClick={() => remove.mutate(retro.id)}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {field("What went well", retro.went_well, "went_well")}
        {field("What to improve", retro.to_improve, "to_improve")}
        {field("Action items", retro.action_items, "action_items")}
      </div>
    </article>
  );
}

export function ProjectRetrospectives({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const retros = useRetrospectives(orgId, projectId);
  const create = useCreateRetrospective(orgId, projectId);
  const [title, setTitle] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    create.mutate({ title: title.trim() }, { onSuccess: () => setTitle("") });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <ClipboardList className="size-4 text-muted-foreground" />
          Retrospectives
        </h2>
        <p className="text-caption text-muted-foreground">
          Capture what went well, what to improve, and action items after a cycle or release.
        </p>
      </div>

      {canManage ? (
        <div className="flex items-end gap-2">
          <Input
            placeholder="Retro title (e.g. Sprint 4 retro)"
            value={title}
            className="w-64"
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button size="sm" onClick={submit} loading={create.isPending} disabled={!title.trim()}>
            <Plus className="size-3.5" />
            New retro
          </Button>
        </div>
      ) : null}

      {retros.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : (retros.data ?? []).length === 0 ? (
        <p className="text-caption text-muted-foreground/70">No retrospectives yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {(retros.data ?? []).map((retro) => (
            <RetroCard key={retro.id} orgId={orgId} projectId={projectId} retro={retro} />
          ))}
        </div>
      )}
    </section>
  );
}
