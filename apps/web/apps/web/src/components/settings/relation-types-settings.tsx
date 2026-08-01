"use client";

import { useState } from "react";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Skeleton } from "@elliptic/ui";
import {
  useCreateRelationType,
  useDeleteRelationType,
  useRelationTypes,
} from "@/hooks/use-relation-type-queries";

export function RelationTypesSettings({ orgId }: { orgId: string }) {
  const types = useRelationTypes(orgId);
  const create = useCreateRelationType(orgId);
  const remove = useDeleteRelationType(orgId);
  const [name, setName] = useState("");
  const [outward, setOutward] = useState("");
  const [inward, setInward] = useState("");

  const submit = () => {
    if (!name.trim() || !outward.trim() || !inward.trim()) return;
    create.mutate(
      { name: name.trim(), outward_label: outward.trim(), inward_label: inward.trim() },
      {
        onSuccess: () => {
          setName("");
          setOutward("");
          setInward("");
        },
      }
    );
  };

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <ArrowLeftRight className="size-4 text-muted-foreground" />
          Custom relation types
        </h2>
        <p className="text-caption text-muted-foreground">
          Define directional relations between work items, e.g. outward &ldquo;implements&rdquo; /
          inward &ldquo;implemented by&rdquo;.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Input placeholder="Name" value={name} className="w-32" onChange={(e) => setName(e.target.value)} />
        <Input
          placeholder="Outward (blocks)"
          value={outward}
          className="w-40"
          onChange={(e) => setOutward(e.target.value)}
        />
        <Input
          placeholder="Inward (blocked by)"
          value={inward}
          className="w-40"
          onChange={(e) => setInward(e.target.value)}
        />
        <Button size="sm" onClick={submit} loading={create.isPending}>
          Add
        </Button>
      </div>

      {types.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : (types.data ?? []).length === 0 ? null : (
        <ul className="flex flex-col gap-1">
          {(types.data ?? []).map((type) => (
            <li
              key={type.id}
              className="group flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-small"
            >
              <span className="flex-1 text-foreground">
                {type.outward_label} <span className="text-muted-foreground">/ {type.inward_label}</span>
              </span>
              <IconButton
                aria-label={`Delete ${type.name}`}
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => remove.mutate(type.id)}
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
