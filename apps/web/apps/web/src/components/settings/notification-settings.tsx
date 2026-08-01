"use client";

import { Bell } from "lucide-react";
import { Skeleton, Switch } from "@elliptic/ui";
import {
  useNotificationPrefs,
  useSetNotificationPrefs,
  type NotificationPrefField,
  type NotificationPrefs,
} from "@/hooks/use-notification-pref-queries";
import { ErrorState } from "@/components/error-state";

const TRIGGERS: { field: NotificationPrefField; label: string; description: string }[] = [
  {
    field: "email_property_change",
    label: "Property changes",
    description: "Priority, assignee, due date, labels and other field changes.",
  },
  {
    field: "email_state_change",
    label: "State changes",
    description: "When a work item moves to a new status.",
  },
  { field: "email_completed", label: "Completed", description: "When a work item is completed." },
  { field: "email_comments", label: "Comments", description: "New comments on items you follow." },
  { field: "email_mentions", label: "Mentions", description: "When you are @-mentioned." },
];

const DEFAULTS: NotificationPrefs = {
  project_id: null,
  email_property_change: true,
  email_state_change: true,
  email_completed: true,
  email_comments: true,
  email_mentions: true,
};

export function NotificationSettings({ orgId }: { orgId: string }) {
  const prefs = useNotificationPrefs(orgId);
  const setPrefs = useSetNotificationPrefs(orgId);

  if (prefs.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (prefs.isError) return <ErrorState error={prefs.error} onRetry={() => void prefs.refetch()} />;

  const workspace = (prefs.data ?? []).find((p) => p.project_id === null) ?? DEFAULTS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Bell className="size-4 text-muted-foreground" />
          Email notifications
        </h2>
        <p className="text-caption text-muted-foreground">
          Choose which events email you. The in-app inbox is always on. These are your
          workspace-wide defaults.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {TRIGGERS.map((trigger) => (
          <li key={trigger.field} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-small font-medium text-foreground">{trigger.label}</span>
              <span className="text-caption text-muted-foreground">{trigger.description}</span>
            </div>
            <Switch
              checked={workspace[trigger.field]}
              disabled={setPrefs.isPending}
              onCheckedChange={(checked) =>
                setPrefs.mutate({ project_id: null, [trigger.field]: checked })
              }
              aria-label={trigger.label}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
