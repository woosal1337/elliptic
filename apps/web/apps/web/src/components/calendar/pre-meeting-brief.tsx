"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, Pin, PinOff, Sparkles, X } from "lucide-react";
import { Skeleton, cn } from "@elliptic/ui";
import { useMeetingBrief } from "@/hooks/use-event-queries";
import { briefSourceHref } from "@/lib/brief";

export function PreMeetingBrief({ orgId, eventId }: { orgId: string; eventId: string }) {
  const brief = useMeetingBrief(orgId, eventId);
  const [dismissed, setDismissed] = useState(false);
  const [pinned, setPinned] = useState(false);

  if (brief.isError) return null;
  if (dismissed && !pinned) return null;

  const bullets = brief.data?.bullets ?? [];

  return (
    <section
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-accent-subtle/60 bg-accent-muted/20 px-3 py-2.5"
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        <span className="text-small font-semibold text-foreground">Pre-meeting brief</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label={pinned ? "Unpin brief" : "Pin brief"}
            aria-pressed={pinned}
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setPinned((value) => !value)}
          >
            {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </button>
          <button
            type="button"
            aria-label="Dismiss brief"
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setDismissed(true)}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {brief.isPending ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : bullets.length === 0 ? (
        <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <Info className="size-3.5" />
          No prior context with these attendees yet — this looks like a fresh start.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {bullets.map((bullet, index) => {
            const href = briefSourceHref(orgId, bullet);
            return (
              <li key={index} className="flex gap-2 text-small text-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  {bullet.text}{" "}
                  {href ? (
                    <Link href={href} className="text-accent hover:underline">
                      {bullet.source_label}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{bullet.source_label}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
