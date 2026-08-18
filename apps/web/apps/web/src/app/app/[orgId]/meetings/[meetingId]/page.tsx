"use client";

import { useParams } from "next/navigation";
import { Clock, ScrollText } from "lucide-react";
import { Badge, Skeleton } from "@elliptic/ui";
import { formatDateTime } from "@/lib/format";
import { useMeeting } from "@/hooks/use-meeting-queries";
import { ErrorState } from "@/components/error-state";
import { TranscriptViewer } from "@/components/meetings/transcript-viewer";
import { ShareMeetingDialog } from "@/components/meetings/share-meeting-dialog";

export default function MeetingDetailPage() {
  const { orgId, meetingId } = useParams<{ orgId: string; meetingId: string }>();
  const meeting = useMeeting(orgId, meetingId);

  if (meeting.isPending) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (meeting.isError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <ErrorState error={meeting.error} onRetry={() => void meeting.refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <ScrollText className="size-3.5" />
            Meeting
          </Badge>
          <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
            <Clock className="size-3.5" />
            {formatDateTime(meeting.data.started_at)}
          </span>
          <div className="ml-auto">
            <ShareMeetingDialog orgId={orgId} meetingId={meetingId} />
          </div>
        </div>
        <h1 className="text-h3 font-semibold tracking-[-0.01em] text-foreground">
          {meeting.data.title}
        </h1>
      </header>

      <TranscriptViewer orgId={orgId} meetingId={meetingId} />
    </div>
  );
}
