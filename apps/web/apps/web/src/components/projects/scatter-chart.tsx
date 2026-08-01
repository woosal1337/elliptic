"use client";

import { useState } from "react";
import { ScatterChart as ScatterIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import { useProgressScatter } from "@/hooks/use-analytics-queries";

const W = 520;
const H = 220;
const PAD = 32;

export function ScatterChart({ orgId, projectId }: { orgId: string; projectId: string }) {
  const [dimension, setDimension] = useState("cycle");
  const scatter = useProgressScatter(orgId, dimension, projectId);
  const points = scatter.data?.points ?? [];
  const maxScope = points.reduce((acc, p) => Math.max(acc, p.scope), 0) || 1;

  const x = (scope: number) => PAD + (scope / maxScope) * (W - 2 * PAD);
  const y = (rate: number) => H - PAD - rate * (H - 2 * PAD);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <ScatterIcon className="size-4 text-muted-foreground" />
          Progress scatter
        </h3>
        <Select value={dimension} onValueChange={setDimension}>
          <SelectTrigger aria-label="Dimension" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cycle">Cycles</SelectItem>
            <SelectItem value="module">Modules</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {scatter.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : points.length === 0 ? (
        <p className="py-8 text-center text-small text-muted-foreground">
          No {dimension}s with work yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Scope vs completion scatter">
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="stroke-border" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} className="stroke-border" />
            <text x={W / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              Scope (work items)
            </text>
            <text x={10} y={H / 2} textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`} className="fill-muted-foreground text-[10px]">
              Completion
            </text>
            {points.map((point) => (
              <g key={point.id}>
                <circle
                  cx={x(point.scope)}
                  cy={y(point.completion_rate)}
                  r={6}
                  className="fill-accent/70 stroke-accent"
                >
                  <title>
                    {point.name}: {point.completed}/{point.scope} ({Math.round(point.completion_rate * 100)}%)
                  </title>
                </circle>
              </g>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}
