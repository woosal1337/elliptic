"use client";

import { useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Skeleton, toast } from "@elliptic/ui";
import {
  useCreateOAuthApp,
  useOAuthApps,
  useRevokeOAuthApp,
} from "@/hooks/use-oauth-app-queries";

export function OAuthAppsSettings() {
  const apps = useOAuthApps();
  const create = useCreateOAuthApp();
  const revoke = useRevokeOAuthApp();
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<{ id: string; secret: string } | null>(null);

  const submit = () => {
    if (!name.trim()) return;
    create.mutate(name.trim(), {
      onSuccess: (app) => {
        setSecret({ id: app.client_id, secret: app.client_secret });
        setName("");
      },
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <KeyRound className="size-4 text-muted-foreground" />
          OAuth apps
        </h2>
        <p className="text-caption text-muted-foreground">
          Register a confidential app for automations. Exchange its client_id + client_secret at{" "}
          <code className="rounded bg-muted px-1 font-mono">/oauth/token</code> (grant_type=
          client_credentials) for a bot token that acts as you.
        </p>
      </div>

      {secret ? (
        <div className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning-muted/40 p-3">
          <span className="text-caption font-medium text-foreground">
            Copy your client secret now — it won&apos;t be shown again.
          </span>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-caption">
              {secret.secret}
            </code>
            <IconButton
              aria-label="Copy secret"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(secret.secret);
                toast.success("Secret copied");
              }}
            >
              <Copy className="size-4" />
            </IconButton>
          </div>
          <span className="font-mono text-caption text-muted-foreground">{secret.id}</span>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <Input
          placeholder="App name"
          value={name}
          className="w-56"
          onChange={(event) => setName(event.target.value)}
        />
        <Button size="sm" onClick={submit} loading={create.isPending} disabled={!name.trim()}>
          <Plus className="size-3.5" />
          Create app
        </Button>
      </div>

      {apps.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : (apps.data ?? []).length === 0 ? null : (
        <ul className="flex flex-col gap-1.5">
          {(apps.data ?? []).map((app) => (
            <li
              key={app.client_id}
              className="group flex items-center gap-2 rounded-md border border-border px-3 py-2 text-small"
            >
              <span className="flex-1 truncate text-foreground">{app.client_name}</span>
              <span className="hidden truncate font-mono text-caption text-muted-foreground sm:inline">
                {app.client_id}
              </span>
              <IconButton
                aria-label={`Revoke ${app.client_name}`}
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => revoke.mutate(app.client_id)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
