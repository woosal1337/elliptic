"use client";

import { Clock, Video } from "lucide-react";
import { EmptyState, Skeleton } from "@companyos/ui";
import { formatTimestamp, relativeTime } from "@/lib/format";
import { useMeetings } from "@/hooks/use-meeting-queries";
import { ErrorState } from "@/components/error-state";
import { ContentCard } from "@/components/content-card";
import type { Meeting } from "@/lib/types";

function meetingExcerpt(meeting: Meeting): string | null {
  const attendees = meeting.external_attendees.filter((name) => name.trim().length > 0);
  if (attendees.length === 0) return null;
  if (attendees.length <= 3) return attendees.join(", ");
  return `${attendees.slice(0, 3).join(", ")} +${attendees.length - 3} more`;
}

export function MeetingList({
  orgId,
  projectId,
  emptyAction,
}: {
  orgId: string;
  projectId?: string;
  emptyAction?: React.ReactNode;
}) {
  const meetings = useMeetings(orgId, projectId);

  if (meetings.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (meetings.isError) {
    return <ErrorState error={meetings.error} onRetry={() => void meetings.refetch()} />;
  }

  if (meetings.data.length === 0) {
    return (
      <EmptyState
        icon={<Video />}
        title="No meetings yet"
        description="Import a transcript and Elliptic will summarize it, link every claim to its source, and let you ask follow-up questions."
        action={emptyAction}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {meetings.data.map((meeting) => {
        const started = relativeTime(meeting.started_at);
        return (
          <li key={meeting.id}>
            <ContentCard
              href={`/app/${orgId}/meetings/${meeting.id}`}
              title={meeting.title}
              summary={meetingExcerpt(meeting)}
              tag={{ label: meeting.source }}
              timestamp={{
                label: started.relative,
                title: started.title,
                iso: meeting.started_at,
              }}
              leading={
                <span className="flex size-9 items-center justify-center rounded-md bg-subtle text-muted-foreground">
                  <Video className="size-4" />
                </span>
              }
              trailing={
                meeting.duration_seconds ? (
                  <span className="flex items-center gap-1 pt-1 text-caption text-muted-foreground">
                    <Clock className="size-3" />
                    {formatTimestamp(meeting.duration_seconds)}
                  </span>
                ) : null
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
