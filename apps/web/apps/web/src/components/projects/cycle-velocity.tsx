"use client";

import { TrendingUp } from "lucide-react";
import { Card } from "@elliptic/ui";
import { useCycleVelocity } from "@/hooks/use-cycle-queries";

export function CycleVelocity({ orgId, projectId }: { orgId: string; projectId: string }) {
  const velocity = useCycleVelocity(orgId, projectId);
  const data = velocity.data;
  if (!data || data.cycle_count === 0) return null;

  const max = Math.max(1, ...data.cycles.map((c) => c.total));

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <TrendingUp className="size-4 text-muted-foreground" />
          Velocity
        </h3>
        <span className="text-caption text-muted-foreground">
          Avg <span className="font-medium text-foreground">{data.average_velocity}</span> done /
          cycle
        </span>
      </div>
      <div className="flex items-end gap-2" style={{ height: "5rem" }}>
        {data.cycles.map((cycle) => (
          <div key={cycle.id} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className="flex w-full max-w-12 flex-col justify-end overflow-hidden rounded-t bg-muted"
              style={{ height: `${(cycle.total / max) * 100}%`, minHeight: "0.25rem" }}
              title={`${cycle.name}: ${cycle.completed}/${cycle.total} done`}
            >
              <div
                className="w-full bg-success"
                style={{
                  height: cycle.total > 0 ? `${(cycle.completed / cycle.total) * 100}%` : "0%",
                }}
              />
            </div>
            <span className="max-w-12 truncate text-caption text-muted-foreground">
              {cycle.name}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
