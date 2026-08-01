import {
  AtSign,
  Bell,
  CheckCircle2,
  CircleDot,
  MessageSquare,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { BadgeProps } from "@elliptic/ui";
import type { Notification } from "@/hooks/use-notification-queries";

export interface NotificationKindMeta {
  label: string;
  icon: LucideIcon;
  tone: NonNullable<BadgeProps["variant"]>;
}

const KIND_META: Record<string, NotificationKindMeta> = {
  assigned: { label: "Assigned", icon: CircleDot, tone: "accent" },
  mention: { label: "Mention", icon: AtSign, tone: "accent" },
  comment: { label: "Comment", icon: MessageSquare, tone: "neutral" },
  member_added: { label: "Added", icon: UserPlus, tone: "neutral" },
  meeting_action_done: { label: "Closed the loop", icon: CheckCircle2, tone: "success" },
};

const FALLBACK_META: NotificationKindMeta = {
  label: "Update",
  icon: Bell,
  tone: "neutral",
};

export function notificationMeta(type: string): NotificationKindMeta {
  return KIND_META[type] ?? FALLBACK_META;
}

export function entityHref(orgId: string, notification: Notification): string | null {
  const base = `/app/${orgId}`;
  switch (notification.entity_type) {
    case "project":
      return `${base}/projects/${notification.entity_id}`;
    case "meeting":
      return `${base}/meetings/${notification.entity_id}`;
    case "note":
      return `${base}/notes/${notification.entity_id}`;
    case "task":
      return `${base}/projects?task=${notification.entity_id}`;
    default:
      return null;
  }
}

export function isMeetingActionDone(notification: Notification): boolean {
  return notification.type === "meeting_action_done";
}
