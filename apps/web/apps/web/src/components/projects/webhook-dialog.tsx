"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, KeyRound, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Input,
  Label,
  Separator,
  Skeleton,
  Switch,
  toast,
} from "@elliptic/ui";
import type { Webhook } from "@/lib/types";
import {
  useCreateWebhook,
  useUpdateWebhook,
  useWebhookCatalog,
} from "@/hooks/use-webhook-queries";
import { ErrorState } from "@/components/error-state";

function providerFromUrl(url: string): "Slack" | "Discord" | "Unknown" {
  try {
    const host = new URL(url).host;
    if (host === "hooks.slack.com") return "Slack";
    if (host.includes("discord")) return "Discord";
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

const webhookSchema = z.object({
  url: z.string(),
  name: z.string(),
});

type WebhookValues = z.infer<typeof webhookSchema>;

export function WebhookDialog({
  orgId,
  projectId,
  mode,
  webhook,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  trigger,
}: {
  orgId: string;
  projectId: string;
  mode: "create" | "edit";
  webhook?: Webhook;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChangeProp?.(next);
    else setInternalOpen(next);
  };

  const catalog = useWebhookCatalog(orgId, projectId);
  const createWebhook = useCreateWebhook(orgId, projectId);
  const updateWebhook = useUpdateWebhook(orgId, projectId);

  const [enabled, setEnabled] = useState(webhook?.enabled ?? true);
  const [events, setEvents] = useState<Set<string>>(new Set(webhook?.events ?? []));
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const form = useForm<WebhookValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: "", name: webhook?.name ?? "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ url: "", name: webhook?.name ?? "" });
    setEnabled(webhook?.enabled ?? true);
    setEvents(new Set(webhook?.events ?? []));
    setCreatedSecret(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const urlValue = form.watch("url");
  const provider = providerFromUrl(urlValue);

  const toggleEvent = (key: string, checked: boolean) => {
    setEvents((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleGroup = (keys: string[], checked: boolean) => {
    setEvents((current) => {
      const next = new Set(current);
      for (const key of keys) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const isPending = createWebhook.isPending || updateWebhook.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const url = values.url.trim();
    const name = values.name.trim() || null;
    const eventList = Array.from(events);

    if (mode === "create") {
      const result = z.url({ protocol: /^https$/ }).safeParse(url);
      if (!result.success) {
        form.setError("url", { message: "Enter a valid https URL" });
        return;
      }
      createWebhook.mutate(
        { url, name, events: eventList, enabled },
        { onSuccess: (created) => setCreatedSecret(created.signing_secret) }
      );
      return;
    }

    if (url.length > 0) {
      const result = z.url({ protocol: /^https$/ }).safeParse(url);
      if (!result.success) {
        form.setError("url", { message: "Enter a valid https URL" });
        return;
      }
    }

    if (!webhook) return;
    updateWebhook.mutate(
      {
        id: webhook.id,
        input: {
          ...(url.length > 0 ? { url } : {}),
          name,
          events: eventList,
          enabled,
        },
      },
      { onSuccess: () => setOpen(false) }
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="size-4" />
            Add webhook
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent size="lg" className="flex max-h-[85dvh] flex-col">
        <DialogHeader>
          <DialogTitle>
            {createdSecret
              ? "Webhook created"
              : mode === "create"
                ? "Add webhook"
                : "Edit webhook"}
          </DialogTitle>
          <DialogDescription>
            {createdSecret
              ? "Save this signing secret now — it won't be shown again."
              : "Push project events to a Slack or Discord incoming webhook URL."}
          </DialogDescription>
        </DialogHeader>
        {createdSecret ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
              <div className="flex items-center gap-2 text-small font-medium text-foreground">
                <KeyRound className="size-4 text-muted-foreground" />
                Signing secret
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-caption text-foreground">
                  {createdSecret}
                </code>
                <IconButton
                  aria-label="Copy signing secret"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(createdSecret)
                      .then(() => toast.success("Signing secret copied"))
                      .catch(() => toast.error("Could not copy"));
                  }}
                >
                  <Copy className="size-4" />
                </IconButton>
              </div>
              <p className="text-caption text-muted-foreground">
                Verify deliveries with the <code className="font-mono">X-Elliptic-Signature</code>{" "}
                header (<code className="font-mono">sha256=HMAC(secret, timestamp.body)</code>), where
                the timestamp is sent as <code className="font-mono">X-Elliptic-Timestamp</code>.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="webhook-url"
                  className="flex-1"
                  autoComplete="off"
                  placeholder={
                    mode === "edit"
                      ? webhook?.url_hint ?? "https://hooks.slack.com/services/…"
                      : "https://hooks.slack.com/services/…"
                  }
                  aria-invalid={form.formState.errors.url ? true : undefined}
                  {...form.register("url")}
                />
                {urlValue.trim().length > 0 ? (
                  <Badge variant="outline">{provider}</Badge>
                ) : null}
              </div>
              {form.formState.errors.url ? (
                <p className="text-caption text-danger">{form.formState.errors.url.message}</p>
              ) : mode === "edit" ? (
                <p className="text-caption text-muted-foreground">
                  Leave blank to keep the stored URL.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="webhook-name">Name (optional)</Label>
              <Input
                id="webhook-name"
                autoComplete="off"
                placeholder="Engineering alerts"
                {...form.register("name")}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5">
              <div className="flex flex-col">
                <span className="text-small font-medium text-foreground">Enabled</span>
                <span className="text-caption text-muted-foreground">
                  Deliveries are paused while disabled.
                </span>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enabled" />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Events</Label>
              {catalog.isPending ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : catalog.isError ? (
                <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />
              ) : (
                <div className="flex flex-col gap-3">
                  {catalog.data.groups.map((group, groupIndex) => {
                    const groupKeys = group.events.map((event) => event.key);
                    const selectedInGroup = groupKeys.filter((key) => events.has(key)).length;
                    const allSelected =
                      groupKeys.length > 0 && selectedInGroup === groupKeys.length;
                    const someSelected = selectedInGroup > 0 && !allSelected;
                    const groupState = allSelected
                      ? true
                      : someSelected
                        ? "indeterminate"
                        : false;
                    return (
                      <div key={group.domain} className="flex flex-col gap-2">
                        {groupIndex > 0 ? <Separator /> : null}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`webhook-group-${group.domain}`}
                            checked={groupState}
                            onCheckedChange={(checked) => toggleGroup(groupKeys, checked === true)}
                            aria-label={`Select all ${group.domain} events`}
                            className="data-[state=indeterminate]:bg-accent"
                          />
                          <Label
                            htmlFor={`webhook-group-${group.domain}`}
                            className="text-small font-semibold capitalize text-foreground"
                          >
                            {group.domain}
                          </Label>
                        </div>
                        <div className="flex flex-col gap-1.5 pl-6">
                          {group.events.map((event) => (
                            <div key={event.key} className="flex items-center gap-2">
                              <Checkbox
                                id={`webhook-event-${event.key}`}
                                checked={events.has(event.key)}
                                onCheckedChange={(checked) =>
                                  toggleEvent(event.key, checked === true)
                                }
                              />
                              <Label
                                htmlFor={`webhook-event-${event.key}`}
                                className="text-small font-normal text-muted-foreground"
                              >
                                {event.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {mode === "create" ? "Create webhook" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
