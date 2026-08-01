"use client";

import { Check, X } from "lucide-react";
import { Badge, IconButton, Skeleton, Switch } from "@elliptic/ui";
import type { Project } from "@/lib/types";
import { useUpdateProject } from "@/hooks/use-project-queries";
import { useDecideWorklog, useProjectPendingWorklogs } from "@/hooks/use-worklog-queries";

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ProjectWorklogApprovals({
  orgId,
  project,
  canManage,
}: {
  orgId: string;
  project: Project;
  canManage: boolean;
}) {
  const updateProject = useUpdateProject(orgId, project.id);
  const required = project.worklog_approval_required;
  const pending = useProjectPendingWorklogs(orgId, project.id, canManage && required);
  const decide = useDecideWorklog(orgId, project.id);
  if (!canManage) return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-semibold text-foreground">Time-log approvals</h2>
          <p className="text-caption text-muted-foreground">
            Require admin approval before logged time on this project counts as final.
          </p>
        </div>
        <Switch
          checked={required}
          disabled={updateProject.isPending}
          onCheckedChange={(checked) =>
            updateProject.mutate({ worklog_approval_required: checked })
          }
          aria-label="Require worklog approval"
        />
      </div>

      {required ? (
        pending.isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : (pending.data ?? []).length === 0 ? (
          <p className="text-caption text-muted-foreground">No time entries awaiting approval.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {(pending.data ?? []).map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 px-3 py-2">
                <Badge variant="warning">Pending</Badge>
                <span className="text-small text-foreground">{formatMinutes(entry.minutes)}</span>
                <span className="flex-1 truncate text-caption text-muted-foreground">
                  {entry.user_name ?? "Someone"} · {entry.note ?? "No note"}
                </span>
                <IconButton
                  aria-label="Approve"
                  variant="ghost"
                  size="sm"
                  onClick={() => decide.mutate({ worklogId: entry.id, approve: true })}
                >
                  <Check className="size-4 text-success" />
                </IconButton>
                <IconButton
                  aria-label="Reject"
                  variant="ghost"
                  size="sm"
                  onClick={() => decide.mutate({ worklogId: entry.id, approve: false })}
                >
                  <X className="size-4 text-danger" />
                </IconButton>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
