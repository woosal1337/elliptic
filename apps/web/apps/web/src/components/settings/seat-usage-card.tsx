"use client";

import { CreditCard } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@elliptic/ui";
import { useSeatUsage } from "@/hooks/use-org-queries";

const ROLE_ORDER = ["owner", "admin", "member", "guest"];

export function SeatUsageCard({ orgId }: { orgId: string }) {
  const seats = useSeatUsage(orgId);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          Seats
        </CardTitle>
        <CardDescription>
          Owners, admins, and members use a paid seat. Guests are free.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        {seats.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : seats.isError || !seats.data ? null : (
          <>
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col">
                <span className="text-h2 font-semibold tabular-nums text-foreground">
                  {seats.data.billable_seats}
                </span>
                <span className="text-caption text-muted-foreground">Billable seats</span>
              </div>
              <div className="flex flex-col">
                <span className="text-h2 font-semibold tabular-nums text-foreground">
                  {seats.data.free_seats}
                </span>
                <span className="text-caption text-muted-foreground">Free (guests)</span>
              </div>
              <div className="flex flex-col">
                <span className="text-h2 font-semibold tabular-nums text-foreground">
                  {seats.data.bot_users}
                </span>
                <span className="text-caption text-muted-foreground">Agents (non-billable)</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_ORDER.filter((role) => (seats.data!.by_role[role] ?? 0) > 0).map((role) => (
                <Badge key={role} variant="neutral" size="sm" className="capitalize">
                  {role} · {seats.data!.by_role[role]}
                </Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
