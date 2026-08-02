"use client";

import { Fragment, type ReactNode, useMemo, useState } from "react";
import { FileText, ScrollText, Sparkles } from "lucide-react";
import { Badge, EmptyState, Skeleton, cn } from "@elliptic/ui";
import { formatRelative } from "@/lib/format";
import { useSummaries, useTranscript } from "@/hooks/use-meeting-queries";
import { ErrorState } from "@/components/error-state";
import { TranscriptViewer } from "./transcript-viewer";
import {
  matchLineToSegment,
  parseSummarySections,
  parseSummaryLines,
  type SummaryLine,
} from "./provenance";
import type { TranscriptSegment } from "@/lib/types";

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_PATTERN).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded-xs bg-subtle px-1 py-0.5 font-mono text-mono-label text-foreground/80"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch && linkMatch[1] && linkMatch[2]) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

interface LineMapping {
  line: SummaryLine;
  segmentIds: string[];
}

function buildMappings(
  lines: SummaryLine[],
  segments: TranscriptSegment[]
): LineMapping[] {
  return lines.map((line) => {
    const match = matchLineToSegment(line.raw, segments);
    return { line, segmentIds: match ? [match.segment.id] : [] };
  });
}

export function MeetingSplitView({
  orgId,
  meetingId,
}: {
  orgId: string;
  meetingId: string;
}) {
  const summaries = useSummaries(orgId, meetingId);
  const transcript = useTranscript(orgId, meetingId);

  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [highlightedSegmentIds, setHighlightedSegmentIds] = useState<string[]>([]);
  const [citingLineIds, setCitingLineIds] = useState<string[]>([]);

  const segments = useMemo(() => transcript.data ?? [], [transcript.data]);
  const latestSummary = summaries.data?.[0] ?? null;

  const lines = useMemo(
    () => (latestSummary ? parseSummaryLines(latestSummary.content) : []),
    [latestSummary]
  );

  const sections = useMemo(
    () => (latestSummary ? parseSummarySections(latestSummary.content) : []),
    [latestSummary]
  );

  const mappings = useMemo(() => buildMappings(lines, segments), [lines, segments]);

  const segmentToLineIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const mapping of mappings) {
      for (const segmentId of mapping.segmentIds) {
        const existing = map.get(segmentId);
        if (existing) existing.push(mapping.line.id);
        else map.set(segmentId, [mapping.line.id]);
      }
    }
    return map;
  }, [mappings]);

  const lineToSegmentIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const mapping of mappings) {
      map.set(mapping.line.id, mapping.segmentIds);
    }
    return map;
  }, [mappings]);

  const citingSet = useMemo(() => new Set(citingLineIds), [citingLineIds]);

  const handleLineClick = (lineId: string) => {
    const targets = lineToSegmentIds.get(lineId) ?? [];
    if (targets.length === 0) return;
    setActiveLineId(lineId);
    setHighlightedSegmentIds(targets);
    setCitingLineIds([]);
  };

  const handleSegmentClick = (segmentId: string) => {
    const citing = segmentToLineIds.get(segmentId) ?? [];
    setCitingLineIds(citing);
    setHighlightedSegmentIds([segmentId]);
    setActiveLineId(null);
  };

  const anchoredCount = mappings.filter((mapping) => mapping.segmentIds.length > 0).length;

  if (summaries.isPending || transcript.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (summaries.isError) {
    return <ErrorState error={summaries.error} onRetry={() => void summaries.refetch()} />;
  }

  if (!latestSummary) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title="No summary yet"
        description="Generate a summary to compare it against the transcript side by side."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <article className="flex min-w-0 flex-col gap-3">
        <header className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
          <span className="flex items-center gap-1.5 text-foreground">
            <FileText className="size-3.5 text-accent" />
            <span className="text-small font-semibold">Summary</span>
          </span>
          <Badge variant="accent" dot>
            AI-generated
          </Badge>
          <span className="font-mono tabular-nums">{latestSummary.model}</span>
          <span aria-hidden>·</span>
          <span>{formatRelative(latestSummary.created_at)}</span>
          {segments.length > 0 ? (
            <span className="ml-auto">
              {anchoredCount} of {lines.length} linked
            </span>
          ) : null}
        </header>

        <div className="flex flex-col gap-4 rounded-lg border border-accent-subtle bg-accent-muted/30 p-4 shadow-xs">
          {sections.map((section) => (
            <section key={section.kind} className="flex flex-col gap-1.5">
              <h4 className="text-mono-label font-mono text-muted-foreground">
                {section.kind}
              </h4>
              <ul className="flex flex-col gap-1">
                {section.lines.map((line) => {
                  const targets = lineToSegmentIds.get(line.id) ?? [];
                  const linked = targets.length > 0;
                  const isActive = line.id === activeLineId;
                  const isCiting = citingSet.has(line.id);
                  return (
                    <li key={line.id}>
                      <button
                        type="button"
                        disabled={!linked}
                        onClick={() => handleLineClick(line.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                          linked ? "cursor-pointer hover:bg-subtle" : "cursor-default",
                          (isActive || isCiting) && "bg-accent-muted/70 ring-1 ring-accent/40"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-2 size-1 shrink-0 rounded-full",
                            linked ? "bg-accent" : "bg-muted-foreground/40"
                          )}
                          aria-hidden
                        />
                        <span className="flex-1 text-small leading-relaxed text-muted-foreground">
                          {renderInline(line.raw)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </article>

      <article className="flex min-w-0 flex-col gap-3">
        <header className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <ScrollText className="size-3.5 text-accent" />
          <span className="text-small font-semibold text-foreground">Transcript</span>
          <span className="ml-auto">Click a segment to find the lines citing it</span>
        </header>
        <TranscriptViewer
          orgId={orgId}
          meetingId={meetingId}
          highlightedSegmentIds={highlightedSegmentIds}
          onSegmentClick={handleSegmentClick}
        />
      </article>
    </div>
  );
}
