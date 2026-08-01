"use client";

import { useState } from "react";
import { Pencil, Send, Trash2, Webhook } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  IconButton,
  Skeleton,
  Switch,
} from "@elliptic/ui";
import type { Webhook as WebhookEntity } from "@/lib/types";
import {
  useDeleteWebhook,
  useProjectWebhooks,
  useTestWebhook,
  useUpdateWebhook,
} from "@/hooks/use-webhook-queries";
import { ErrorState } from "@/components/error-state";
import { WebhookDialog } from "@/components/projects/webhook-dialog";

function DeliveryStatus({ webhook }: { webhook: WebhookEntity }) {
  if (!webhook.last_delivery_status) return null;
  const ok = webhook.last_delivery_status === "ok";
  return (
    <Badge variant={ok ? "success" : "danger"} dot>
      {ok ? "Delivered" : "Failed"}
    </Badge>
  );
}

function WebhookRow({
  orgId,
  projectId,
  webhook,
}: {
  orgId: string;
  projectId: string;
  webhook: WebhookEntity;
}) {
  const updateWebhook = useUpdateWebhook(orgId, projectId);
  const testWebhook = useTestWebhook(orgId, projectId);
  const deleteWebhook = useDeleteWebhook(orgId, projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-xs">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {webhook.provider}
          </Badge>
          {webhook.name ? (
            <span className="truncate text-small font-medium text-foreground">{webhook.name}</span>
          ) : null}
          <DeliveryStatus webhook={webhook} />
        </div>
        <span className="truncate font-mono text-caption text-muted-foreground">
          {webhook.url_hint}
        </span>
        <span className="text-caption text-muted-foreground">
          {webhook.events.length} events
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={webhook.enabled}
          onCheckedChange={(checked) =>
            updateWebhook.mutate({ id: webhook.id, input: { enabled: checked } })
          }
          aria-label={`${webhook.enabled ? "Disable" : "Enable"} webhook`}
        />
        <Button
          size="sm"
          variant="outline"
          loading={testWebhook.isPending}
          onClick={() => testWebhook.mutate(webhook.id)}
        >
          <Send className="size-3.5" />
          Test
        </Button>
        <IconButton aria-label="Edit webhook" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil />
        </IconButton>
        <IconButton
          aria-label="Delete webhook"
          variant="danger"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 />
        </IconButton>
      </div>

      <WebhookDialog
        orgId={orgId}
        projectId={projectId}
        mode="edit"
        webhook={webhook}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete webhook?</DialogTitle>
            <DialogDescription>
              This removes the webhook and stops all deliveries to it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleteWebhook.isPending}
              onClick={() =>
                deleteWebhook.mutate(webhook.id, { onSuccess: () => setConfirmOpen(false) })
              }
            >
              Delete webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

export function WebhooksSettings({ orgId, projectId }: { orgId: string; projectId: string }) {
  const webhooks = useProjectWebhooks(orgId, projectId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>Push project events to Slack or Discord.</CardDescription>
        </div>
        <WebhookDialog orgId={orgId} projectId={projectId} mode="create" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-5">
        {webhooks.isPending ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : webhooks.isError ? (
          <ErrorState error={webhooks.error} onRetry={() => void webhooks.refetch()} />
        ) : webhooks.data.length === 0 ? (
          <EmptyState
            icon={<Webhook />}
            title="No webhooks yet"
            description="Add a Slack or Discord webhook to get notified about project events."
            action={<WebhookDialog orgId={orgId} projectId={projectId} mode="create" />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {webhooks.data.map((webhook) => (
              <WebhookRow
                key={webhook.id}
                orgId={orgId}
                projectId={projectId}
                webhook={webhook}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
