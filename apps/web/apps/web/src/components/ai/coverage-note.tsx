"use client";

import { ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@elliptic/ui";
import {
  CONFIDENCE_LABELS,
  coverageLabel,
  type ConfidenceBand,
  type Coverage,
} from "@/lib/confidence";

const BAND_STYLE: Record<ConfidenceBand, string> = {
  high: "text-success",
  medium: "text-muted-foreground",
  low: "text-warning",
};

const BAND_ICON: Record<ConfidenceBand, typeof ShieldCheck> = {
  high: ShieldCheck,
  medium: Sparkles,
  low: TriangleAlert,
};

export function ConfidenceBadge({
  band,
  label,
  className,
}: {
  band: ConfidenceBand;
  label?: string;
  className?: string;
}) {
  const Icon = BAND_ICON[band];
  return (
    <span className={cn("inline-flex items-center gap-1 text-caption", BAND_STYLE[band], className)}>
      <Icon className="size-3" />
      {label ?? CONFIDENCE_LABELS[band]}
    </span>
  );
}

export function CoverageNote({
  band,
  coverage,
  note,
  className,
}: {
  band: ConfidenceBand;
  coverage?: Coverage;
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <ConfidenceBadge band={band} />
      {coverage ? (
        <span className="tabular font-mono text-caption text-muted-foreground">
          {coverageLabel(coverage)}
        </span>
      ) : null}
      {note ? <span className="text-caption text-muted-foreground">{note}</span> : null}
    </div>
  );
}
