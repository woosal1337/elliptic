"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  type BadgeProps,
} from "@elliptic/ui";
import { hierarchy } from "@/lib/hierarchy";

export interface ContentCardTag {
  label: string;
  variant?: BadgeProps["variant"];
  icon?: ReactNode;
}

export interface ContentCardProps {
  href: string;
  title: string;
  summary?: string | null;
  tag?: ContentCardTag;
  timestamp?: { label: string; title: string; iso?: string };
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export function ContentCard({
  href,
  title,
  summary,
  tag,
  timestamp,
  leading,
  trailing,
  className,
}: ContentCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-xs transition-all duration-150 hover:border-input hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
    >
      {leading ? <span className="mt-0.5 shrink-0">{leading}</span> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {tag || timestamp ? (
          <div className="flex items-center gap-2">
            {tag ? (
              <Badge variant={tag.variant ?? "outline"} size="sm" className="capitalize">
                {tag.icon}
                {tag.label}
              </Badge>
            ) : null}
            {timestamp ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <time dateTime={timestamp.iso} className={cn(hierarchy.meta, "cursor-default")}>
                    {timestamp.label}
                  </time>
                </TooltipTrigger>
                <TooltipContent>{timestamp.title}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        ) : null}
        <span className={cn(hierarchy.headline, "truncate")}>{title}</span>
        {summary && summary.length > 0 ? (
          <span className={hierarchy.supporting}>{summary}</span>
        ) : null}
      </div>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}
