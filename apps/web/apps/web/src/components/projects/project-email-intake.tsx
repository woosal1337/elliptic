"use client";

import { Copy, Mail, Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Skeleton, toast } from "@elliptic/ui";
import {
  useCreateEmailIntake,
  useDeleteEmailIntake,
  useEmailIntakes,
} from "@/hooks/use-email-intake-queries";

export function ProjectEmailIntake({
  orgId,
  projectId,
  canManage,
}: {
  orgId: string;
  projectId: string;
  canManage: boolean;
}) {
  const intakes = useEmailIntakes(orgId, projectId);
  const create = useCreateEmailIntake(orgId, projectId);
  const remove = useDeleteEmailIntake(orgId, projectId);

  const webhookUrl = (token: string) =>
    typeof window === "undefined"
      ? `/api/v1/integrations/email/${token}`
      : `${window.location.origin}/api/v1/integrations/email/${token}`;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Mail className="size-4 text-muted-foreground" />
          Email to task
        </h2>
        <p className="text-caption text-muted-foreground">
          Point your email provider&apos;s inbound-parse webhook at this URL; each forwarded email
          opens a triage task here.
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
                aria-label="Copy intake URL"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(webhookUrl(intake.token));
                  toast.success("Intake URL copied");
                }}
              >
                <Copy className="size-4" />
              </IconButton>
              {canManage ? (
                <IconButton
                  aria-label="Delete intake"
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
          New email intake
        </Button>
      ) : null}
    </section>
  );
}
