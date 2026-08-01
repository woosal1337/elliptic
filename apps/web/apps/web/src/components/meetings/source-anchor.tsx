"use client";

import { CornerDownRight, Search, ShieldQuestion } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from "@elliptic/ui";
import { formatTimestamp } from "@/lib/format";
import type { SourceMatch } from "./provenance";
import { useAnchor } from "./anchor-context";

export function SourceAnchor({
  match,
  onJump,
}: {
  match: SourceMatch | null;
  onJump?: () => void;
}) {
  const { requestSegment } = useAnchor();

  if (!match) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              aria-label="No direct transcript source"
              className="inline-flex size-5 shrink-0 translate-y-px items-center justify-center rounded-sm text-muted-foreground/40 opacity-0 transition-opacity duration-150 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 group-hover/line:opacity-100"
            >
              <ShieldQuestion className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>No direct source in this transcript. Verify manually.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const { segment } = match;

  const jump = () => {
    requestSegment(segment.id);
    onJump?.();
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={jump}
            aria-label={`View transcript source: ${segment.speaker} at ${formatTimestamp(segment.start_seconds)}`}
            className="inline-flex size-5 shrink-0 translate-y-px items-center justify-center rounded-sm text-accent/60 opacity-0 transition-all duration-150 hover:text-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 group-hover/line:opacity-100"
          >
            <Search className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 bg-surface text-left text-foreground shadow-lg ring-1 ring-border">
          <span className="flex items-center justify-between gap-3 text-caption">
            <span className="font-semibold text-accent">{segment.speaker}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {formatTimestamp(segment.start_seconds)}
            </span>
          </span>
          <span className="mt-1.5 block text-small leading-relaxed text-foreground/90">
            &ldquo;{truncate(segment.text, 220)}&rdquo;
          </span>
          <span
            className={cn(
              "mt-2 flex items-center gap-1 text-caption font-medium text-accent"
            )}
          >
            <CornerDownRight className="size-3" />
            Click to jump to transcript
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}
