"use client";

import { ArrowRight } from "lucide-react";
import { Badge, Skeleton } from "@elliptic/ui";
import { useTaskTransitions } from "@/hooks/use-task-queries";
import { STATUS_LABELS } from "@/lib/task-meta";
import { ErrorState } from "@/components/error-state";

function humanizeDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}

function statusLabel(status: string | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status.replace("_", " ");
}

export function TaskTransitions({ orgId, taskId }: { orgId: string; taskId: string }) {
  const query = useTaskTransitions(orgId, taskId, true);

  if (query.isPending) return <Skeleton className="h-24 w-full" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <span className="text-caption text-muted-foreground">Currently</span>
        <Badge variant="neutral" className="capitalize">
          {statusLabel(data.current_status)}
        </Badge>
        <span className="text-caption text-muted-foreground">
          for {humanizeDuration(data.seconds_in_current)}
        </span>
      </div>
      {data.transitions.length === 0 ? (
        <p className="text-small text-muted-foreground">
          No recorded transitions yet (changes within the first few minutes after creation aren&apos;t
          tracked).
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {data.transitions.map((transition, index) => (
            <li key={`${transition.at}-${index}`} className="flex items-center gap-2 text-small">
              <span className="capitalize text-muted-foreground">
                {statusLabel(transition.from_status)}
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <span className="capitalize font-medium text-foreground">
                {statusLabel(transition.to_status)}
              </span>
              <Badge variant="neutral" size="sm">
                {humanizeDuration(transition.seconds_in_prev)} in prev
              </Badge>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
