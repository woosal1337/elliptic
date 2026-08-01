"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { Clock, Columns2, FileText, ScrollText } from "lucide-react";
import { Badge, Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, cn } from "@elliptic/ui";
import { formatDateTime, formatTimestamp } from "@/lib/format";
import { useMeeting } from "@/hooks/use-meeting-queries";
import { ErrorState } from "@/components/error-state";
import { AnchorProvider } from "@/components/meetings/anchor-context";
import { MeetingDocument } from "@/components/meetings/meeting-document";
import { MeetingSplitView } from "@/components/meetings/meeting-split-view";
import { TranscriptViewer } from "@/components/meetings/transcript-viewer";
import { ChatPanel } from "@/components/meetings/chat-panel";
import { MeetingFilingBanner } from "@/components/meetings/meeting-filing-banner";
import { ShareMeetingDialog } from "@/components/meetings/share-meeting-dialog";
import { SlackShareDialog } from "@/components/meetings/slack-share-dialog";

export default function MeetingDetailPage() {
  const { orgId, meetingId } = useParams<{ orgId: string; meetingId: string }>();
  const meeting = useMeeting(orgId, meetingId);
  const [tab, setTab] = useState<"document" | "transcript">("document");
  const [split, setSplit] = useState(false);

  const handleAnchorRequest = useCallback(() => {
    setSplit(false);
    setTab("transcript");
  }, []);

  return (
    <AnchorProvider onRequest={handleAnchorRequest}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
        {meeting.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-52" />
          </div>
        ) : meeting.isError ? (
          <ErrorState error={meeting.error} onRetry={() => void meeting.refetch()} />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h3 font-semibold tracking-[-0.02em] text-foreground">
                {meeting.data.title}
              </h1>
              <Badge variant="outline" className="capitalize">
                {meeting.data.source}
              </Badge>
              <span className="ml-auto flex items-center gap-1">
                <SlackShareDialog orgId={orgId} meetingId={meetingId} />
                <ShareMeetingDialog orgId={orgId} meetingId={meetingId} />
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-small text-muted-foreground">
              <span>{formatDateTime(meeting.data.started_at)}</span>
              {meeting.data.duration_seconds ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {formatTimestamp(meeting.data.duration_seconds)}
                </span>
              ) : null}
            </div>
          </div>
        )}

        {meeting.data ? <MeetingFilingBanner orgId={orgId} meeting={meeting.data} /> : null}

        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            split ? "lg:grid-cols-1" : "xl:grid-cols-[1fr_24rem]"
          )}
        >
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                variant={split ? "outline" : "ghost"}
                aria-pressed={split}
                className="hidden lg:inline-flex"
                onClick={() => setSplit((value) => !value)}
              >
                <Columns2 className="size-4" />
                {split ? "Exit split view" : "Split view"}
              </Button>
            </div>

            {split ? (
              <MeetingSplitView orgId={orgId} meetingId={meetingId} />
            ) : (
              <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
                <TabsList>
                  <TabsTrigger value="document">
                    <FileText />
                    Document
                  </TabsTrigger>
                  <TabsTrigger value="transcript">
                    <ScrollText />
                    Transcript
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="document">
                  <MeetingDocument
                    orgId={orgId}
                    meetingId={meetingId}
                    rawMarkdown={meeting.data?.raw_markdown ?? null}
                  />
                </TabsContent>
                <TabsContent value="transcript">
                  <div className="flex flex-col gap-3">
                    <p className="text-caption text-muted-foreground">
                      The verbatim record. AI summary lines link here so you can check any claim
                      against what was actually said.
                    </p>
                    <TranscriptViewer orgId={orgId} meetingId={meetingId} />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
          {split ? null : (
            <div className="xl:sticky xl:top-6 xl:self-start">
              <ChatPanel orgId={orgId} meetingId={meetingId} />
            </div>
          )}
        </div>
      </div>
    </AnchorProvider>
  );
}
