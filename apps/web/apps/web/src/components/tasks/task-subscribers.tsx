"use client";

import { Avatar } from "@elliptic/ui";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { useTaskSubscribers } from "@/hooks/use-task-queries";

export function TaskSubscribers({ orgId, taskId }: { orgId: string; taskId: string }) {
  const subscribers = useTaskSubscribers(orgId, taskId);
  const members = useOrgMembers(orgId);
  const ids = subscribers.data ?? [];

  if (ids.length === 0) return null;

  const nameOf = (userId: string) =>
    members.data?.find((member) => member.user_id === userId)?.full_name ?? "Member";

  const shown = ids.slice(0, 4);
  const extra = ids.length - shown.length;

  return (
    <div
      className="flex items-center -space-x-1.5"
      title={`${ids.length} subscriber${ids.length === 1 ? "" : "s"}`}
    >
      {shown.map((userId) => (
        <Avatar
          key={userId}
          name={nameOf(userId)}
          size="sm"
          className="ring-1 ring-surface"
        />
      ))}
      {extra > 0 ? (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-1 ring-surface">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
