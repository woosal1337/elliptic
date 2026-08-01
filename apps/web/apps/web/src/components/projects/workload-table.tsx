"use client";

import { Users } from "lucide-react";
import { Avatar, Skeleton } from "@elliptic/ui";
import { useMemberWorkload } from "@/hooks/use-analytics-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";

export function WorkloadTable({ orgId, projectId }: { orgId: string; projectId: string }) {
  const workload = useMemberWorkload(orgId, projectId);
  const members = useOrgMembers(orgId);

  const nameOf = (userId: string) => {
    const member = (members.data ?? []).find((m) => m.user_id === userId);
    return member?.full_name || member?.email || "Unknown";
  };

  const rows = workload.data?.members ?? [];

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="flex items-center gap-2 text-small font-semibold text-foreground">
        <Users className="size-4 text-muted-foreground" />
        Member workload
      </h3>
      {workload.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-small text-muted-foreground">No assigned work yet.</p>
      ) : (
        <table className="w-full border-collapse text-caption">
          <thead>
            <tr className="text-muted-foreground">
              <th className="border-b border-border p-2 text-left font-medium">Member</th>
              <th className="border-b border-border p-2 text-right font-medium">Open</th>
              <th className="border-b border-border p-2 text-right font-medium">In progress</th>
              <th className="border-b border-border p-2 text-right font-medium">Done (30d)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.assignee_id}>
                <td className="border-b border-border/60 p-2">
                  <span className="flex items-center gap-2">
                    <Avatar name={nameOf(row.assignee_id)} size="sm" />
                    <span className="truncate text-foreground">{nameOf(row.assignee_id)}</span>
                  </span>
                </td>
                <td className="border-b border-border/60 p-2 text-right font-semibold tabular-nums text-foreground">
                  {row.open}
                </td>
                <td className="border-b border-border/60 p-2 text-right tabular-nums text-muted-foreground">
                  {row.in_progress}
                </td>
                <td className="border-b border-border/60 p-2 text-right tabular-nums text-muted-foreground">
                  {row.completed_30d}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
