"use client";

import { useParams } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { Badge, Logo, Skeleton } from "@elliptic/ui";
import { formatTimestamp } from "@/lib/format";
import { usePublicMeetingShare } from "@/hooks/use-public-share-queries";

export default function PublicMeetingSharePage() {
  const { token } = useParams<{ token: string }>();
  const share = usePublicMeetingShare(token);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo />
        <Badge variant="outline">Shared meeting</Badge>
      </header>

      {share.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : share.isError ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface px-6 py-16 text-center">
          <ShieldOff className="size-8 text-muted-foreground" />
          <p className="text-small font-medium text-foreground">This link is no longer available</p>
          <p className="text-caption text-muted-foreground">
            The owner may have revoked access. Ask them to share it again.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-h2 font-semibold tracking-[-0.02em] text-foreground">
              {share.data.meeting_title}
            </h1>
          </div>




          {share.data.include_transcript && share.data.transcript.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-h4 font-semibold text-foreground">Transcript</h2>
              <ol className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-surface p-3">
                {share.data.transcript.map((segment) => (
                  <li key={segment.id} className="grid grid-cols-[3.5rem_1fr] gap-3">
                    <span className="text-right font-mono text-caption tabular-nums text-muted-foreground">
                      {formatTimestamp(segment.start_seconds)}
                    </span>
                    <div>
                      <span className="text-caption font-semibold text-accent">{segment.speaker}</span>
                      <p className="text-small text-foreground">{segment.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

        </>
      )}
    </div>
  );
}
