"use client";

import { useEffect } from "react";
import { Avatar, Badge, Skeleton, cn } from "@elliptic/ui";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/task-meta";
import { formatRelative } from "@/lib/format";
import { useTask, useTaskComments } from "@/hooks/use-task-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { PriorityIcon, StatusDot } from "./task-bits";
import { plainText } from "@/components/notes/markdown";

export function TaskPeek({
  orgId,
  taskId,
  onClose,
}: {
  orgId: string;
  taskId: string | null;
  onClose: () => void;
}) {
  const open = taskId !== null;
  const task = useTask(orgId, taskId ?? "", open);
  const comments = useTaskComments(orgId, taskId ?? "", open);
  const members = useOrgMembers(orgId);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("[data-task-peek]")) return;
      onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose]);

  if (!open) return null;

  const memberName = (id: string) =>
    members.data?.find((member) => member.user_id === id)?.full_name ?? "Unknown";

  const recentComments = (comments.data ?? []).slice(-2);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-4">
      <div
        data-task-peek
        role="dialog"
        aria-label="Task preview"
        className={cn(
          "pointer-events-auto w-full max-w-md origin-center overflow-hidden rounded-xl border border-border bg-surface shadow-xl",
          "animate-content-in"
        )}
      >
        {task.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : task.isError ? (
          <div className="p-4 text-small text-muted-foreground">Could not load preview.</div>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-col gap-2 border-b border-border p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {task.data.identifier}
                </Badge>
                <span className="text-caption text-muted-foreground">
                  {formatRelative(task.data.updated_at)}
                </span>
              </div>
              <h3 className="text-body font-semibold leading-snug text-foreground">
                {task.data.title}
              </h3>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 p-4">
              <div className="flex items-center gap-2">
                <dt className="text-caption text-muted-foreground">Status</dt>
                <dd className="flex items-center gap-1.5 text-small text-foreground">
                  <StatusDot status={task.data.status} />
                  {STATUS_LABELS[task.data.status]}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-caption text-muted-foreground">Priority</dt>
                <dd className="flex items-center gap-1.5 text-small text-foreground">
                  <PriorityIcon priority={task.data.priority} />
                  {PRIORITY_LABELS[task.data.priority]}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-caption text-muted-foreground">Assignee</dt>
                <dd className="flex items-center gap-1.5 text-small text-foreground">
                  {task.data.assignee_id ? (
                    <>
                      <Avatar name={memberName(task.data.assignee_id)} size="xs" />
                      <span className="truncate">{memberName(task.data.assignee_id)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-caption text-muted-foreground">Due</dt>
                <dd className="text-small text-foreground">
                  {task.data.due_date ? formatRelative(task.data.due_date) : "—"}
                </dd>
              </div>
            </dl>

            {task.data.description ? (
              <p className="line-clamp-3 border-t border-border px-4 py-3 text-small leading-relaxed text-muted-foreground">
                {plainText(task.data.description)}
              </p>
            ) : null}

            {recentComments.length > 0 ? (
              <ul className="flex flex-col gap-2 border-t border-border px-4 py-3">
                {recentComments.map((comment) => (
                  <li key={comment.id} className="flex gap-2">
                    <Avatar name={memberName(comment.author_id)} size="xs" className="mt-0.5" />
                    <p className="line-clamp-2 text-small leading-snug text-muted-foreground">
                      {plainText(comment.content)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="border-t border-border px-4 py-2 text-caption text-muted-foreground">
              Press <span className="font-medium text-foreground">Space</span> or{" "}
              <span className="font-medium text-foreground">Esc</span> to close ·{" "}
              <span className="font-medium text-foreground">Return</span> to open
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
