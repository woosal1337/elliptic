"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import type { TaskStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/task-meta";
import { formatRelative } from "@/lib/format";
import {
  useApproveApproval,
  useRejectApproval,
  useRequestApproval,
  useTaskApprovals,
} from "@/hooks/use-approval-queries";

const STATE_VARIANT: Record<string, "neutral" | "success" | "danger" | "warning"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export function TaskApprovalsSection({
  orgId,
  taskId,
  status,
}: {
  orgId: string;
  taskId: string;
  status: TaskStatus;
}) {
  const approvals = useTaskApprovals(orgId, taskId);
  const request = useRequestApproval(orgId, taskId);
  const approve = useApproveApproval(orgId, taskId);
  const reject = useRejectApproval(orgId, taskId);
  const [target, setTarget] = useState<TaskStatus | "">("");

  const rows = approvals.data ?? [];
  const hasPending = rows.some((a) => a.state === "pending");

  return (
    <div className="flex flex-col gap-3">
      {!hasPending ? (
        <div className="flex items-center gap-2">
          <Select value={target} onValueChange={(value) => setTarget(value as TaskStatus)}>
            <SelectTrigger className="h-8 flex-1" aria-label="Status to request">
              <SelectValue placeholder="Request move to…" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.filter((s) => s !== status).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!target || request.isPending}
            onClick={() =>
              target &&
              request.mutate({ target_status: target }, { onSuccess: () => setTarget("") })
            }
          >
            Request
          </Button>
        </div>
      ) : null}

      {approvals.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-caption text-muted-foreground">No approval requests.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((approval) => (
            <li
              key={approval.id}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-small"
            >
              <Badge variant={STATE_VARIANT[approval.state]}>{approval.state}</Badge>
              <span className="min-w-0 flex-1 truncate text-foreground">
                → {STATUS_LABELS[approval.target_status]}
              </span>
              {approval.state === "pending" ? (
                <span className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(approval.id)}
                  >
                    <Check className="size-3.5 text-success" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate(approval.id)}
                  >
                    <X className="size-3.5 text-danger" />
                  </Button>
                </span>
              ) : (
                <span className="shrink-0 text-caption text-muted-foreground/70">
                  {formatRelative(approval.created_at)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
