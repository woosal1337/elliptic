"use client";

import { CreditCard, TriangleAlert } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import { useEdition, useSetPlan } from "@/hooks/use-edition-queries";

export function EditionCard({ orgId }: { orgId: string }) {
  const edition = useEdition(orgId);
  const setPlan = useSetPlan(orgId);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          Plan &amp; licensing
        </CardTitle>
        <CardDescription>
          Your edition sets seat limits, bundled AI credits, and which features are available.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        {edition.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : edition.data ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={edition.data.plan} onValueChange={(value) => setPlan.mutate(value)}>
                <SelectTrigger className="w-40" aria-label="Plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {edition.data.available_plans.map((option) => (
                    <SelectItem key={option.plan} value={option.plan}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-small text-muted-foreground">
                {edition.data.billable_seats} / {edition.data.seat_limit.toLocaleString()} seats
                {edition.data.bot_users > 0
                  ? ` · +${edition.data.bot_users} agent${edition.data.bot_users === 1 ? "" : "s"} (non-billable)`
                  : ""}{" "}
                · {edition.data.ai_credits_per_seat.toLocaleString()} AI credits/seat
              </span>
            </div>

            {edition.data.over_seat_limit ? (
              <div className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger-muted/30 px-3 py-2 text-small text-danger">
                <TriangleAlert className="size-4 shrink-0" />
                You&apos;re over your seat limit. Upgrade to add more billable members.
              </div>
            ) : (
              <p className="text-caption text-muted-foreground">
                {edition.data.seats_remaining.toLocaleString()} seats remaining on{" "}
                {edition.data.label}.
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {edition.data.features.map((feature) => (
                <Badge key={feature} variant="neutral" size="sm">
                  {feature === "*" ? "all features" : feature.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
