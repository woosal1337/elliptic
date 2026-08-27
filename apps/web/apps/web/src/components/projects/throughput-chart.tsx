"use client";

import { useEffect, useMemo, useRef } from "react";
import { Activity } from "lucide-react";
import { EmptyState, Skeleton } from "@elliptic/ui";
import type { ThroughputPoint } from "@/lib/types";
import { useThroughput } from "@/hooks/use-analytics-queries";
import { ErrorState } from "@/components/error-state";

const W = 600;
const H = 160;
const PAD = 8;

function line(points: ThroughputPoint[], pick: (p: ThroughputPoint) => number, max: number) {
  const n = points.length;
  return points
    .map((point, index) => {
      const x = n === 1 ? W / 2 : PAD + (index / (n - 1)) * (W - PAD * 2);
      const y = H - PAD - (pick(point) / max) * (H - PAD * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ThroughputChart({ orgId, projectId }: { orgId: string; projectId: string }) {
  const throughput = useThroughput(orgId, projectId, 30);
  const points = useMemo(() => throughput.data ?? [], [throughput.data]);

  const totals = useMemo(
    () => ({
      created: points.reduce((sum, point) => sum + point.created, 0),
      resolved: points.reduce((sum, point) => sum + point.resolved, 0),
    }),
    [points]
  );
  const max = useMemo(
    () => Math.max(1, ...points.map((point) => Math.max(point.created, point.resolved))),
    [points]
  );

  const svgRef = useRef<SVGSVGElement>(null);

  // The line draws itself from the first day to the last one, so each path
  // needs its own length as the dash pattern. A constant would finish the
  // reveal early on a short path and leave the rest of the animation empty.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    for (const path of svg.querySelectorAll("path")) {
      path.style.setProperty("--draw-length", `${path.getTotalLength()}`);
    }
  }, [points, max]);

  if (throughput.isPending) return <Skeleton className="h-48 w-full rounded-lg" />;
  if (throughput.isError) {
    return <ErrorState error={throughput.error} onRetry={() => void throughput.refetch()} />;
  }
  if (totals.created === 0 && totals.resolved === 0) {
    return (
      <EmptyState
        icon={<Activity />}
        title="No throughput yet"
        description="Created vs resolved work over the last 30 days will appear here as activity builds up."
      />
    );
  }

  const first = points[0]?.date;
  const last = points[points.length - 1]?.date;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-small font-semibold text-foreground">Throughput · last 30 days</h3>
        <div className="flex items-center gap-4 text-caption">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            {totals.created} created
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            {totals.resolved} resolved
          </span>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Created versus resolved work items over the last 30 days"
      >
        <path
          d={line(points, (p) => p.created, max)}
          fill="none"
          className="animate-draw-in stroke-accent"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line(points, (p) => p.resolved, max)}
          fill="none"
          className="animate-draw-in stroke-success"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-caption text-muted-foreground">
        <span>{first ? new Date(first).toLocaleDateString() : ""}</span>
        <span>{last ? new Date(last).toLocaleDateString() : ""}</span>
      </div>
    </div>
  );
}
