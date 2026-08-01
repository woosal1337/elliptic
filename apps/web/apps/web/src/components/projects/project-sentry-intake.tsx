"use client";

import { Copy, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button, IconButton, Skeleton, toast } from "@elliptic/ui";
import {
  useCreateSentryIntake,
  useDeleteSentryIntake,
  useSentryIntakes,
} from "@/hooks/use-sentry-queries";

export function ProjectSentryIntake({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const intakes = useSentryIntakes(orgId, projectId);
  const create = useCreateSentryIntake(orgId, projectId);
  const remove = useDeleteSentryIntake(orgId, projectId);

  const webhookUrl = (token: string) =>
    typeof window === "undefined"
      ? `/api/v1/integrations/sentry/${token}`
      : `${window.location.origin}/api/v1/integrations/sentry/${token}`;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <TriangleAlert className="size-4 text-muted-foreground" />
          Sentry alerts
        </h2>
        <p className="text-caption text-muted-foreground">
          Add the webhook URL to a Sentry alert rule; matching alerts open triage bugs here.
        </p>
      </div>

      {intakes.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : (intakes.data ?? []).length === 0 ? null : (
        <ul className="flex flex-col gap-1.5">
          {(intakes.data ?? []).map((intake) => (
            <li
              key={intake.id}
              className="group flex items-center gap-2 rounded-md border border-border px-3 py-2 text-small"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-caption text-muted-foreground">
                {webhookUrl(intake.token)}
              </span>
              <IconButton
                aria-label="Copy webhook URL"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(webhookUrl(intake.token));
                  toast.success("Webhook URL copied");
                }}
              >
                <Copy className="size-4" />
              </IconButton>
              {canManage ? (
                <IconButton
                  aria-label="Delete webhook"
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => remove.mutate(intake.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <Button size="sm" variant="outline" onClick={() => create.mutate()} loading={create.isPending}>
          <Plus className="size-3.5" />
          New Sentry webhook
        </Button>
      ) : null}
    </section>
  );
}
