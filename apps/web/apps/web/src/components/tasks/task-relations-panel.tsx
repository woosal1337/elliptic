"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Button,
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@elliptic/ui";
import type { RelatedTask, TaskRelationKind } from "@/lib/types";
import {
  useCreateRelation,
  useDeleteRelation,
  useTaskRelations,
  useTasks,
} from "@/hooks/use-task-queries";
import { useRelationTypes } from "@/hooks/use-relation-type-queries";
import { ErrorState } from "@/components/error-state";
import { formatDate } from "@/lib/format";
import { StatusDot } from "./task-bits";

const RELATION_LABELS: Record<TaskRelationKind, string> = {
  blocks: "Blocking",
  blocked_by: "Blocked by",
  related: "Related",
  duplicate: "Duplicates",
  duplicate_of: "Duplicated by",
  implements: "Implements",
  implemented_by: "Implemented by",
};

const RELATION_ORDER: TaskRelationKind[] = [
  "blocks",
  "blocked_by",
  "related",
  "duplicate",
  "duplicate_of",
  "implements",
  "implemented_by",
];

function RelationRow({
  orgId,
  projectId,
  taskId,
  relation,
  onOpen,
}: {
  orgId: string;
  projectId: string;
  taskId: string;
  relation: RelatedTask;
  onOpen?: (taskId: string) => void;
}) {
  const deleteRelation = useDeleteRelation(orgId, projectId, taskId);

  return (
    <li className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-surface">
      <StatusDot status={relation.status} />
      <span className="shrink-0 font-mono text-caption text-muted-foreground">
        {relation.identifier}
      </span>
      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(relation.task_id)}
          className="min-w-0 flex-1 truncate text-left text-small text-foreground transition-colors duration-150 hover:text-accent focus-visible:text-accent focus-visible:outline-none"
        >
          {relation.title}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-small text-foreground">
          {relation.title}
        </span>
      )}
      {relation.due_date ? (
        <span className="shrink-0 text-caption tabular text-muted-foreground">
          {formatDate(relation.due_date)}
        </span>
      ) : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton
            aria-label={`Remove relation to ${relation.identifier}`}
            variant="danger"
            size="sm"
            className="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
            disabled={deleteRelation.isPending}
            onClick={() => deleteRelation.mutate(relation.relation_id)}
          >
            <X />
          </IconButton>
        </TooltipTrigger>
        <TooltipContent>Remove relation</TooltipContent>
      </Tooltip>
    </li>
  );
}

function AddRelation({
  orgId,
  projectId,
  taskId,
}: {
  orgId: string;
  projectId: string;
  taskId: string;
}) {
  const tasks = useTasks(orgId, projectId);
  const createRelation = useCreateRelation(orgId, projectId, taskId);
  const customTypes = useRelationTypes(orgId);
  const [active, setActive] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [type, setType] = useState<string>("blocks");

  const candidates = (tasks.data ?? []).filter((task) => task.id !== taskId);

  const submit = () => {
    if (!target || createRelation.isPending) {
      return;
    }
    const isCustom = type.startsWith("custom:");
    createRelation.mutate(
      isCustom
        ? { target_task_id: target, custom_type_id: type.slice("custom:".length) }
        : { target_task_id: target, type: type as TaskRelationKind },
      {
        onSuccess: () => {
          setTarget(null);
          setType("blocks");
          setActive(false);
        },
      }
    );
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-caption text-muted-foreground transition-colors duration-150 hover:bg-surface hover:text-foreground focus-visible:bg-surface focus-visible:text-foreground focus-visible:outline-none"
      >
        <Plus className="size-3.5 shrink-0" aria-hidden="true" />
        Add relation
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-input bg-surface p-2.5 shadow-xs">
      <Select value={type} onValueChange={(next) => setType(next)}>
        <SelectTrigger aria-label="Relation type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RELATION_ORDER.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {RELATION_LABELS[kind]}
            </SelectItem>
          ))}
          {(customTypes.data ?? []).map((custom) => (
            <SelectItem key={custom.id} value={`custom:${custom.id}`} className="capitalize">
              {custom.outward_label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={target ?? ""}
        onValueChange={(next) => setTarget(next)}
        disabled={candidates.length === 0}
      >
        <SelectTrigger aria-label="Related task">
          <SelectValue placeholder={candidates.length === 0 ? "No other tasks" : "Select a task"} />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((task) => (
            <SelectItem key={task.id} value={task.id}>
              <span className="flex items-center gap-2">
                <StatusDot status={task.status} />
                <span className="font-mono text-caption text-muted-foreground">
                  {task.identifier}
                </span>
                <span className="min-w-0 truncate">{task.title}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTarget(null);
            setType("blocks");
            setActive(false);
          }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={submit}
          loading={createRelation.isPending}
          disabled={!target}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

export function TaskRelationsPanel({
  orgId,
  projectId,
  taskId,
  onOpen,
}: {
  orgId: string;
  projectId: string;
  taskId: string;
  onOpen?: (taskId: string) => void;
}) {
  const relations = useTaskRelations(orgId, taskId);
  const items = relations.data ?? [];

  const groups = RELATION_ORDER.map((kind) => ({
    kind,
    rows: items.filter((relation) => relation.type === kind),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="flex flex-col gap-2">
      {relations.isPending ? (
        <Skeleton className="h-7 w-full" />
      ) : relations.isError ? (
        <ErrorState error={relations.error} onRetry={() => void relations.refetch()} />
      ) : items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.kind} className="flex flex-col gap-1">
              <span className="px-2 text-caption text-muted-foreground">
                {RELATION_LABELS[group.kind]}
              </span>
              <ul className="flex flex-col">
                {group.rows.map((relation) => (
                  <RelationRow
                    key={relation.relation_id}
                    orgId={orgId}
                    projectId={projectId}
                    taskId={taskId}
                    relation={relation}
                    onOpen={onOpen}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      <AddRelation orgId={orgId} projectId={projectId} taskId={taskId} />
    </div>
  );
}
