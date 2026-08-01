"use client";

import { useState } from "react";
import { Check, Sparkles, Wand2 } from "lucide-react";
import { Badge, Button, IconButton, Skeleton } from "@elliptic/ui";
import {
  useCatchUp,
  useCatchUpMarkSeen,
  useCatchUpSummary,
} from "@/hooks/use-notification-queries";

function typeLabel(type: string): string {
  return type.replace(/_/g, " ");
}

export function CatchUpPanel({ orgId }: { orgId: string }) {
  const catchUp = useCatchUp(orgId);
  const markSeen = useCatchUpMarkSeen(orgId);
  const summarize = useCatchUpSummary(orgId);
  const [summary, setSummary] = useState<string | null>(null);

  if (catchUp.isPending) return <Skeleton className="h-20 w-full rounded-lg" />;
  if (catchUp.isError || !catchUp.data) return null;
  if (catchUp.data.total_unread === 0) return null;

  const { total_unread, by_type, groups } = catchUp.data;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-accent/40 bg-accent-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        <h2 className="text-small font-semibold text-foreground">
          Catch up — {total_unread} unread across {groups.length} item{groups.length === 1 ? "" : "s"}
        </h2>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(by_type).map(([type, count]) => (
          <Badge key={type} variant="neutral" size="sm" className="capitalize">
            {typeLabel(type)} · {count}
          </Badge>
        ))}
      </div>
      <ul className="flex flex-col gap-1">
        {groups.slice(0, 6).map((group) => (
          <li
            key={`${group.entity_type}-${group.entity_id ?? group.title}`}
            className="group flex items-center gap-2 text-caption text-muted-foreground"
          >
            <Badge variant="outline" size="sm" className="capitalize">
              {group.entity_type}
            </Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">{group.title}</span>
            <span className="tabular">
              {group.count} update{group.count === 1 ? "" : "s"}
            </span>
            {group.entity_type === "project" && group.entity_id ? (
              <IconButton
                aria-label="Summarize what changed"
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() =>
                  summarize.mutate(group.entity_id!, {
                    onSuccess: (result) => setSummary(result.summary),
                  })
                }
              >
                <Wand2 className="size-3.5" />
              </IconButton>
            ) : null}
            <IconButton
              aria-label="Mark seen"
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
              onClick={() =>
                markSeen.mutate({
                  entity_type: group.entity_type,
                  entity_id: group.entity_id ?? null,
                })
              }
            >
              <Check className="size-3.5" />
            </IconButton>
          </li>
        ))}
      </ul>

      {summarize.isPending ? (
        <Skeleton className="h-12 w-full rounded-md" />
      ) : summary ? (
        <div className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-caption font-medium text-foreground">
              <Wand2 className="size-3.5 text-accent" />
              What changed
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSummary(null)}>
              Dismiss
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-small text-foreground">{summary}</p>
        </div>
      ) : null}
    </section>
  );
}
