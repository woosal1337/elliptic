"use client";

import { TrendingUp } from "lucide-react";
import { Skeleton } from "@elliptic/ui";
import { useThroughputForecast } from "@/hooks/use-analytics-queries";

export function ForecastCard({ orgId, projectId }: { orgId: string; projectId: string }) {
  const forecast = useThroughputForecast(orgId, projectId, 8);
  const data = forecast.data;
  const max = (data?.weekly ?? []).reduce((acc, week) => Math.max(acc, week.completed), 0) || 1;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <TrendingUp className="size-4 text-muted-foreground" />
          Throughput forecast
        </h3>
        {data ? (
          <span className="text-caption text-muted-foreground">
            avg <span className="font-semibold text-foreground">{data.avg_per_week}</span>/wk · next ≈{" "}
            <span className="font-semibold text-accent">{data.projected_next_week}</span>
          </span>
        ) : null}
      </div>
      {forecast.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : !data ? null : (
        <div className="flex items-end gap-1.5" style={{ height: "96px" }}>
          {data.weekly.map((week) => (
            <div key={week.week_start} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-accent/70"
                  style={{ height: `${Math.max(4, (week.completed / max) * 100)}%` }}
                  title={`${week.completed} completed`}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {week.week_start.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
