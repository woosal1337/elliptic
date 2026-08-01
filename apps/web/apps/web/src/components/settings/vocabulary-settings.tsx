"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  IconButton,
  Input,
  Skeleton,
  Textarea,
} from "@elliptic/ui";
import type { VocabularyTerm } from "@/lib/types";
import { ErrorState } from "@/components/error-state";
import {
  useCreateTerm,
  useDeleteTerm,
  useUpdateTerm,
  useVocabulary,
} from "@/hooks/use-vocabulary-queries";

const termSchema = z.object({
  term: z.string().min(1, "Required").max(120),
  definition: z.string().min(1, "Required").max(2000),
});

type TermForm = z.infer<typeof termSchema>;

function AddTerm({ orgId }: { orgId: string }) {
  const create = useCreateTerm(orgId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TermForm>({ resolver: zodResolver(termSchema) });

  const onSubmit = handleSubmit((values) => {
    create.mutate(values, { onSuccess: () => reset({ term: "", definition: "" }) });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex flex-col gap-1 sm:w-48">
        <Input placeholder="Term" aria-label="Term" {...register("term")} />
        {errors.term ? <span className="text-caption text-danger">{errors.term.message}</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <Input placeholder="What it means" aria-label="Definition" {...register("definition")} />
        {errors.definition ? (
          <span className="text-caption text-danger">{errors.definition.message}</span>
        ) : null}
      </div>
      <Button type="submit" variant="outline" disabled={create.isPending}>
        <Plus className="size-4" />
        Add
      </Button>
    </form>
  );
}

function TermRow({ orgId, term }: { orgId: string; term: VocabularyTerm }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateTerm(orgId);
  const remove = useDeleteTerm(orgId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TermForm>({
    resolver: zodResolver(termSchema),
    defaultValues: { term: term.term, definition: term.definition },
  });

  const onSubmit = handleSubmit((values) => {
    update.mutate({ id: term.id, ...values }, { onSuccess: () => setEditing(false) });
  });

  if (editing) {
    return (
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-start"
      >
        <div className="flex flex-col gap-1 sm:w-48">
          <Input aria-label="Term" {...register("term")} />
          {errors.term ? (
            <span className="text-caption text-danger">{errors.term.message}</span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <Textarea aria-label="Definition" rows={2} {...register("definition")} />
          {errors.definition ? (
            <span className="text-caption text-danger">{errors.definition.message}</span>
          ) : null}
        </div>
        <div className="flex gap-1">
          <IconButton type="submit" variant="ghost" aria-label="Save" disabled={update.isPending}>
            <Check className="size-4 text-success" />
          </IconButton>
          <IconButton
            type="button"
            variant="ghost"
            aria-label="Cancel"
            onClick={() => {
              reset({ term: term.term, definition: term.definition });
              setEditing(false);
            }}
          >
            <X className="size-4" />
          </IconButton>
        </div>
      </form>
    );
  }

  return (
    <div className="group flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <span className="w-48 shrink-0 font-mono text-small font-medium text-foreground">
        {term.term}
      </span>
      <span className="flex-1 text-small text-muted-foreground">{term.definition}</span>
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <IconButton variant="ghost" aria-label="Edit" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" />
        </IconButton>
        <IconButton
          variant="ghost"
          aria-label="Delete"
          disabled={remove.isPending}
          onClick={() => remove.mutate(term.id)}
        >
          <Trash2 className="size-3.5 text-danger" />
        </IconButton>
      </div>
    </div>
  );
}

export function VocabularySettings({ orgId }: { orgId: string }) {
  const { data: terms, isLoading, error, refetch } = useVocabulary(orgId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vocabulary</CardTitle>
        <CardDescription>
          Org-specific terms, names, and acronyms. These are fed into meeting summaries and chat so
          the AI spells them correctly instead of guessing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <AddTerm orgId={orgId} />
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : terms && terms.length > 0 ? (
          <div className="flex flex-col">
            {terms.map((term) => (
              <TermRow key={term.id} orgId={orgId} term={term} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No terms yet"
            description="Add your product names, client names, and acronyms so the AI gets them right."
          />
        )}
      </CardContent>
    </Card>
  );
}
