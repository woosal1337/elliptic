"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileAudio } from "lucide-react";
import { Button, EmptyState, Skeleton, cn } from "@elliptic/ui";
import { formatTimestamp } from "@/lib/format";
import { useMeetingChapters, useTranscript } from "@/hooks/use-meeting-queries";
import { activeChapterIndex, shouldShowChapters } from "@/lib/chapters";
import { ErrorState } from "@/components/error-state";

const PAGE_SIZE = 80;

export function TranscriptViewer({
  orgId,
  meetingId,
  highlightedSegmentIds,
  onSegmentClick,
}: {
  orgId: string;
  meetingId: string;
  highlightedSegmentIds?: string[];
  onSegmentClick?: (segmentId: string) => void;
}) {
  const transcript = useTranscript(orgId, meetingId);
  const chaptersQuery = useMeetingChapters(orgId, meetingId);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const segmentRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const [chapterTargetId, setChapterTargetId] = useState<string | null>(null);
  const [positionSeconds, setPositionSeconds] = useState(0);

  const segments = useMemo(() => transcript.data ?? [], [transcript.data]);
  const chapters = useMemo(() => chaptersQuery.data ?? [], [chaptersQuery.data]);
  const showChapters = useMemo(
    () => shouldShowChapters(chapters, segments.length),
    [chapters, segments.length]
  );
  const activeChapter = useMemo(
    () => activeChapterIndex(chapters, positionSeconds),
    [chapters, positionSeconds]
  );

  const highlightedSet = useMemo(
    () => new Set(highlightedSegmentIds ?? []),
    [highlightedSegmentIds]
  );

  const scrollTargetId = useMemo(
    () => highlightedSegmentIds?.[0] ?? null,
    [highlightedSegmentIds]
  );

  const interactive = Boolean(onSegmentClick);



  useEffect(() => {
    if (!scrollTargetId) return;
    const targetIndex = segments.findIndex((segment) => segment.id === scrollTargetId);
    if (targetIndex >= 0 && targetIndex >= visibleCount) {
      setVisibleCount(Math.max(visibleCount, targetIndex + 1));
    }
  }, [scrollTargetId, segments, visibleCount]);

  useEffect(() => {
    if (!scrollTargetId) return;
    const node = segmentRefs.current.get(scrollTargetId);
    if (!node) return;
    const frame = requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollTargetId, visibleCount]);

  useEffect(() => {
    if (!chapterTargetId) return;
    const targetIndex = segments.findIndex((segment) => segment.id === chapterTargetId);
    if (targetIndex >= 0 && targetIndex >= visibleCount) {
      setVisibleCount(Math.max(visibleCount, targetIndex + 1));
    }
  }, [chapterTargetId, segments, visibleCount]);

  useEffect(() => {
    if (!chapterTargetId) return;
    const node = segmentRefs.current.get(chapterTargetId);
    if (!node) return;
    const frame = requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [chapterTargetId, visibleCount]);

  const visible = useMemo(() => segments.slice(0, visibleCount), [segments, visibleCount]);

  useEffect(() => {
    if (!showChapters) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!top) return;
        const seconds = Number((top.target as HTMLElement).dataset.seconds);
        if (Number.isFinite(seconds)) setPositionSeconds(seconds);
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );
    for (const node of segmentRefs.current.values()) observer.observe(node);
    return () => observer.disconnect();
  }, [showChapters, visible]);

  if (transcript.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (transcript.isError) {
    return <ErrorState error={transcript.error} onRetry={() => void transcript.refetch()} />;
  }

  if (transcript.data.length === 0) {
    return (
      <EmptyState
        icon={<FileAudio />}
        title="No transcript"
        description="This meeting has no transcript segments."
      />
    );
  }

  return (
    <div className="flex gap-4">
      {showChapters ? (
        <nav
          aria-label="Transcript chapters"
          className="hidden w-44 shrink-0 lg:block"
        >
          <ol className="sticky top-2 flex flex-col gap-0.5">
            {chapters.map((chapter, index) => (
              <li key={`${chapter.segment_id}-${index}`}>
                <button
                  type="button"
                  onClick={() => setChapterTargetId(chapter.segment_id)}
                  aria-current={index === activeChapter ? "true" : undefined}
                  className={cn(
                    "flex w-full items-baseline gap-2 rounded-md border-l-2 px-2 py-1.5 text-left transition-colors",
                    index === activeChapter
                      ? "border-accent bg-accent-muted/40 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span className="tabular font-mono text-caption text-muted-foreground">
                    {formatTimestamp(chapter.start_seconds)}
                  </span>
                  <span className="min-w-0 truncate text-caption">{chapter.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
      <ol className="flex max-h-[60dvh] flex-col overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-xs">
        {visible.map((segment) => {
          const isActive = segment.id === null;
          const isHighlighted = highlightedSet.has(segment.id);
          return (
            <li
              key={segment.id}
              data-seconds={segment.start_seconds}
              ref={(node) => {
                if (node) segmentRefs.current.set(segment.id, node);
                else segmentRefs.current.delete(segment.id);
              }}
              onClick={interactive ? () => onSegmentClick?.(segment.id) : undefined}
              className={cn(
                "grid grid-cols-[3.5rem_1fr] gap-3 rounded-md px-2 py-2 transition-colors duration-300 hover:bg-muted/50",
                interactive &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                isActive && "bg-accent-muted/60 ring-1 ring-accent/40",
                isHighlighted && "bg-accent-muted/60 ring-1 ring-accent/40"
              )}
            >
              <span className="pt-0.5 text-right font-mono text-caption tabular-nums text-muted-foreground">
                {formatTimestamp(segment.start_seconds)}
              </span>
              <div className="min-w-0">
                <span className="text-caption font-semibold text-accent">{segment.speaker}</span>
                <p className="mt-0.5 text-small leading-relaxed text-foreground">{segment.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {transcript.data.length > visibleCount ? (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          Show more ({transcript.data.length - visibleCount} remaining)
        </Button>
      ) : null}
      </div>
    </div>
  );
}
