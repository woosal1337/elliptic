"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@elliptic/ui";
import { useActivity } from "@/hooks/use-activity-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/error-state";
import { ActivityList } from "@/components/activity/activity-list";
import { useLastSeen } from "@/components/activity/use-last-seen";
import { countNewSince } from "@/components/activity/activity-grouping";
import type { ActivityEvent } from "@/lib/types";

function entityHref(orgId: string, event: ActivityEvent): string | null {
  const kind = event.entity_type.split(/[._]/)[0];
  const base = `/app/${orgId}`;
  switch (kind) {
    case "project":
      return `${base}/projects/${event.entity_id}`;
    case "note":
      return `${base}/notes/${event.entity_id}`;
    case "meeting":
      return `${base}/meetings/${event.entity_id}`;
    default:
      return null;
  }
}

export default function ActivityPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const activity = useActivity(orgId);
  const members = useOrgMembers(orgId);
  const { lastSeen, ready, markSeen } = useLastSeen(orgId);

  const events = activity.data;

  useEffect(() => {
    if (activity.isSuccess && ready) {
      markSeen();
    }
  }, [activity.isSuccess, ready, markSeen]);

  const actors = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members.data ?? []) {
      map.set(member.user_id, member.full_name);
    }
    return map;
  }, [members.data]);

  const getHref = useMemo(
    () => (event: ActivityEvent) => entityHref(orgId, event),
    [orgId]
  );

  const newCount = useMemo(
    () => (events ? countNewSince(events, lastSeen) : 0),
    [events, lastSeen]
  );

  const description =
    ready && lastSeen !== null && newCount > 0
      ? `${newCount} ${newCount === 1 ? "update" : "updates"} since your last visit.`
      : "What happened across the org while you were away.";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8">
      <PageHeader eyebrow="Organization" title="Activity" description={description} />
      {activity.isPending || !ready ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-3 w-2/5 rounded" />
                <Skeleton className="h-3 w-3/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activity.isError ? (
        <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />
      ) : (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-xs">
          <ActivityList
            events={events ?? []}
            actors={actors}
            lastSeen={lastSeen}
            getEntityHref={getHref}
          />
        </div>
      )}
    </div>
  );
}
