"use client";

import { Gauge } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@elliptic/ui";
import { useAIUsage } from "@/hooks/use-ai-usage";

export function AIUsageCard({ orgId }: { orgId: string }) {
  const usage = useAIUsage(orgId);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-4 text-muted-foreground" />
          AI credits
        </CardTitle>
        <CardDescription>
          {usage.data
            ? `${usage.data.credits_per_seat.toLocaleString()} credits per billable seat each month. One AI action uses one credit.`
            : "Monthly AI credit pool, sized by your billable seats."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-5">
        {usage.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : usage.data ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-h4 font-semibold tabular text-foreground">
                {usage.data.used.toLocaleString()}
                <span className="text-small font-normal text-muted-foreground">
                  {" / "}
                  {usage.data.limit.toLocaleString()}
                </span>
              </span>
              <span className="text-small text-muted-foreground">
                {usage.data.remaining.toLocaleString()} left
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  usage.data.percent_used >= 90 ? "bg-danger" : "bg-accent"
                }`}
                style={{ width: `${Math.min(usage.data.percent_used, 100)}%` }}
              />
            </div>
            <p className="text-caption text-muted-foreground">
              {usage.data.billable_seats} billable{" "}
              {usage.data.billable_seats === 1 ? "seat" : "seats"} · resets monthly
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
