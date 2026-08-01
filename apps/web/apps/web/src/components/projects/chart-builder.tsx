"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import { useCustomChart } from "@/hooks/use-analytics-queries";

const METRICS = [
  { value: "count", label: "Count" },
  { value: "done", label: "Completed" },
  { value: "open", label: "Open" },
];

const DIMENSIONS = [
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "kind", label: "Type" },
  { value: "assignee", label: "Assignee" },
];

export function ChartBuilder({ orgId, projectId }: { orgId: string; projectId: string }) {
  const [metric, setMetric] = useState("count");
  const [dimension, setDimension] = useState("status");
  const chart = useCustomChart(orgId, { metric, dimension, projectId });

  const points = chart.data?.points ?? [];
  const max = points.reduce((acc, point) => Math.max(acc, point.value), 0) || 1;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <BarChart3 className="size-4 text-muted-foreground" />
          Chart builder
        </h3>
        <div className="flex items-center gap-2">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger aria-label="Metric" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-caption text-muted-foreground">by</span>
          <Select value={dimension} onValueChange={setDimension}>
            <SelectTrigger aria-label="Dimension" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIMENSIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {chart.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : points.length === 0 ? (
        <p className="py-8 text-center text-small text-muted-foreground">No data for this view.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {points.map((point) => (
            <li key={point.key} className="flex items-center gap-3 text-caption">
              <span className="w-28 shrink-0 truncate capitalize text-muted-foreground" title={point.key}>
                {point.key.replace(/_/g, " ")}
              </span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-muted/50">
                <div
                  className="flex h-full items-center justify-end rounded bg-accent px-1.5 text-caption font-medium text-accent-foreground"
                  style={{ width: `${Math.max(6, (point.value / max) * 100)}%` }}
                >
                  {point.value}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
