"use client";

import { ListFilter, X } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@elliptic/ui";
import type { Label } from "@/lib/types";
import { PRIORITY_LABELS, PRIORITY_SORT } from "@/lib/task-meta";
import type { UseTaskFilters } from "./task-filters";

export function TaskFilterControl({
  filters,
  labels,
}: {
  filters: UseTaskFilters;
  labels: Label[];
}) {
  const labelById = new Map(labels.map((label) => [label.id, label]));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Filter tasks">
            <ListFilter className="size-3.5" />
            Filter
            {filters.activeCount > 0 ? (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-caption font-medium text-accent-foreground">
                {filters.activeCount}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel>Priority</DropdownMenuLabel>
          {PRIORITY_SORT.map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={filters.filters.priorities.includes(priority)}
              onCheckedChange={() => filters.togglePriority(priority)}
              onSelect={(event) => event.preventDefault()}
            >
              {PRIORITY_LABELS[priority]}
            </DropdownMenuCheckboxItem>
          ))}
          {labels.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Labels</DropdownMenuLabel>
              {labels.map((label) => (
                <DropdownMenuCheckboxItem
                  key={label.id}
                  checked={filters.filters.labelIds.includes(label.id)}
                  onCheckedChange={() => filters.toggleLabel(label.id)}
                  onSelect={(event) => event.preventDefault()}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </>
          ) : null}
          {filters.activeCount > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => filters.clear()}>Clear all</DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {filters.filters.priorities.map((priority) => (
        <FilterChip
          key={`priority-${priority}`}
          label={PRIORITY_LABELS[priority]}
          onRemove={() => filters.togglePriority(priority)}
        />
      ))}
      {filters.filters.labelIds.map((labelId) => {
        const label = labelById.get(labelId);
        if (!label) return null;
        return (
          <FilterChip
            key={`label-${labelId}`}
            label={label.name}
            color={label.color}
            onRemove={() => filters.toggleLabel(labelId)}
          />
        );
      })}
    </div>
  );
}

function FilterChip({
  label,
  color,
  onRemove,
}: {
  label: string;
  color?: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-caption text-foreground">
      {color ? (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
      <span className="max-w-32 truncate">{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
        className="ml-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
