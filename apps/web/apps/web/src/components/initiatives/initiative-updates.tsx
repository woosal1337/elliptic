"use client";

import { useState } from "react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from "@elliptic/ui";
import type { ProjectHealth } from "@/lib/types";
import { relativeTime } from "@/lib/format";
import {
  useInitiativeUpdates,
  usePostInitiativeUpdate,
} from "@/hooks/use-initiative-queries";

const HEALTH: Record<ProjectHealth, { label: string; dot: string; text: string }> = {
  on_track: { label: "On track", dot: "bg-success", text: "text-success" },
  at_risk: { label: "At risk", dot: "bg-warning", text: "text-warning" },
  off_track: { label: "Off track", dot: "bg-danger", text: "text-danger" },
};

export function InitiativeUpdates({
  orgId,
  initiativeId,
}: {
  orgId: string;
  initiativeId: string;
}) {
  const updates = useInitiativeUpdates(orgId, initiativeId);
  const postUpdate = usePostInitiativeUpdate(orgId, initiativeId);
  const [health, setHealth] = useState<ProjectHealth>("on_track");
  const [summary, setSummary] = useState("");

  const submit = () => {
    if (!summary.trim()) return;
    postUpdate.mutate({ health, summary: summary.trim() }, { onSuccess: () => setSummary("") });
  };

  const rows = updates.data ?? [];

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2.5">
        <Select value={health} onValueChange={(value) => setHealth(value as ProjectHealth)}>
          <SelectTrigger className="w-36" aria-label="Health">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(HEALTH) as ProjectHealth[]).map((value) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${HEALTH[value].dot}`} aria-hidden />
                  {HEALTH[value].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Portfolio progress, risks, what's next…"
          rows={2}
          aria-label="Update summary"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={submit}
            loading={postUpdate.isPending}
            disabled={summary.trim().length === 0}
          >
            Post update
          </Button>
        </div>
      </div>

      {updates.isPending ? (
        <Skeleton className="h-10 w-full rounded-md" />
      ) : rows.length === 0 ? (
        <p className="px-1 text-caption text-muted-foreground">No updates yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((update) => {
            const meta = HEALTH[update.health];
            const when = relativeTime(update.created_at);
            return (
              <li
                key={update.id}
                className="flex flex-col gap-1 rounded-md border border-border bg-surface p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${meta.dot}`} aria-hidden />
                  <span className={`text-caption font-semibold ${meta.text}`}>{meta.label}</span>
                  <span className="ml-auto text-caption text-muted-foreground" title={when.title}>
                    {when.relative}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-small leading-relaxed text-foreground">
                  {update.summary}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
