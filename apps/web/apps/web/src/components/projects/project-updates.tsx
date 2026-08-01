"use client";

import { useState } from "react";
import {
  Button,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from "@elliptic/ui";
import { Activity } from "lucide-react";
import type { ProjectHealth } from "@/lib/types";
import { relativeTime } from "@/lib/format";
import { usePostProjectUpdate, useProjectUpdates } from "@/hooks/use-project-update-queries";
import { ErrorState } from "@/components/error-state";

const HEALTH: Record<ProjectHealth, { label: string; dot: string; text: string }> = {
  on_track: { label: "On track", dot: "bg-success", text: "text-success" },
  at_risk: { label: "At risk", dot: "bg-warning", text: "text-warning" },
  off_track: { label: "Off track", dot: "bg-danger", text: "text-danger" },
};

export function ProjectUpdates({ orgId, projectId }: { orgId: string; projectId: string }) {
  const updates = useProjectUpdates(orgId, projectId);
  const postUpdate = usePostProjectUpdate(orgId, projectId);
  const [health, setHealth] = useState<ProjectHealth>("on_track");
  const [summary, setSummary] = useState("");

  const submit = () => {
    if (!summary.trim()) return;
    postUpdate.mutate(
      { health, summary: summary.trim() },
      { onSuccess: () => setSummary("") }
    );
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Select value={health} onValueChange={(value) => setHealth(value as ProjectHealth)}>
            <SelectTrigger className="w-40" aria-label="Health">
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
        </div>
        <Textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="What's the state of this project? Wins, risks, what's next…"
          rows={3}
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
      </section>

      {updates.isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : updates.isError ? (
        <ErrorState error={updates.error} onRetry={() => void updates.refetch()} />
      ) : (updates.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Activity />}
          title="No updates yet"
          description="Post the first project health update above."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {updates.data.map((update) => {
            const meta = HEALTH[update.health];
            const when = relativeTime(update.created_at);
            return (
              <li
                key={update.id}
                className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${meta.dot}`} aria-hidden />
                  <span className={`text-small font-semibold ${meta.text}`}>{meta.label}</span>
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
