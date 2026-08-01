"use client";

import { useState } from "react";
import { Check, RotateCcw, Send, Trash2, Webhook } from "lucide-react";
import { Badge, Button, IconButton, Input, Skeleton } from "@elliptic/ui";
import {
  useCreateOrgWebhook,
  useDeleteOrgWebhook,
  useDispatchEvents,
  useOrgWebhooks,
  useOutboxEvents,
  useRetryEvent,
} from "@/hooks/use-event-backbone";

export function WebhooksSettings({ orgId }: { orgId: string }) {
  const webhooks = useOrgWebhooks(orgId);
  const events = useOutboxEvents(orgId);
  const create = useCreateOrgWebhook(orgId);
  const remove = useDeleteOrgWebhook(orgId);
  const dispatch = useDispatchEvents(orgId);
  const retry = useRetryEvent(orgId);
  const [url, setUrl] = useState("");
  const [types, setTypes] = useState("");

  const submit = () => {
    if (!url.trim()) return;
    create.mutate(
      {
        url: url.trim(),
        event_types: types
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          setUrl("");
          setTypes("");
        },
      }
    );
  };

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
            <Webhook className="size-4 text-muted-foreground" />
            Webhooks
          </h2>
          <p className="text-caption text-muted-foreground">
            Subscribe an HTTPS endpoint to workspace events. Each delivery is signed with an
            HMAC-SHA256 <code>X-Elliptic-Signature</code> header. Leave event types blank to
            receive everything.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/webhooks/elliptic"
          />
          <Input
            value={types}
            onChange={(event) => setTypes(event.target.value)}
            placeholder="Event types, comma-separated (e.g. task.created, project.updated)"
            className="font-mono text-caption"
          />
          <div>
            <Button size="sm" onClick={submit} loading={create.isPending} disabled={!url.trim()}>
              Add webhook
            </Button>
          </div>
        </div>

        {webhooks.isPending ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : (webhooks.data ?? []).length === 0 ? (
          <p className="text-small text-muted-foreground">No webhooks yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(webhooks.data ?? []).map((hook) => (
              <li
                key={hook.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-caption text-foreground">
                  {hook.url}
                </span>
                {hook.event_types.length === 0 ? (
                  <Badge variant="neutral" size="sm">
                    all events
                  </Badge>
                ) : (
                  hook.event_types.map((type) => (
                    <Badge key={type} variant="outline" size="sm">
                      {type}
                    </Badge>
                  ))
                )}
                <IconButton
                  aria-label={`Delete webhook ${hook.url}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate(hook.id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-small font-semibold text-foreground">Recent events</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => dispatch.mutate()}
            loading={dispatch.isPending}
          >
            <Send className="size-3.5" />
            Dispatch pending
          </Button>
        </div>
        {events.isPending ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : (events.data ?? []).length === 0 ? (
          <p className="text-small text-muted-foreground">No events captured yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {(events.data ?? []).map((event) => (
              <li key={event.id} className="flex items-center gap-2 px-3 py-2 text-caption">
                <span className="font-mono text-foreground">{event.event_type}</span>
                {event.failed && event.delivery_error ? (
                  <span className="min-w-0 truncate text-muted-foreground" title={event.delivery_error}>
                    {event.delivery_error}
                  </span>
                ) : null}
                <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                  {event.delivered_at ? (
                    <Badge variant="success" size="sm">
                      <Check className="size-3" />
                      delivered
                    </Badge>
                  ) : event.failed ? (
                    <>
                      <Badge variant="danger" size="sm">
                        dead-letter ({event.attempts})
                      </Badge>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-accent hover:bg-muted"
                        onClick={() => retry.mutate(event.id)}
                      >
                        <RotateCcw className="size-3" />
                        Retry
                      </button>
                    </>
                  ) : event.delivery_error ? (
                    <Badge variant="warning" size="sm">
                      retrying ({event.attempts})
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      pending
                    </Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
