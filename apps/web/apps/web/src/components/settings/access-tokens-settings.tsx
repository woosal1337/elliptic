"use client";

import { useState } from "react";
import { Copy, KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { Button, EmptyState, IconButton, Input, Skeleton, toast } from "@elliptic/ui";
import { relativeTime } from "@/lib/format";
import {
  useCreatePersonalToken,
  usePersonalTokens,
  useRegeneratePersonalToken,
  useRevokePersonalToken,
} from "@/hooks/use-access-token-queries";
import { ErrorState } from "@/components/error-state";

export function AccessTokensSettings() {
  const tokens = usePersonalTokens();
  const createToken = useCreatePersonalToken();
  const revokeToken = useRevokePersonalToken();
  const regenerateToken = useRegeneratePersonalToken();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim()) return;
    createToken.mutate(
      { name: name.trim(), description: description.trim() || null },
      {
        onSuccess: (token) => {
          setCreated(token.token);
          setName("");
          setDescription("");
        },
      }
    );
  };

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Personal access tokens</h2>
        <p className="text-caption text-muted-foreground">
          Use a token to call the public REST API as yourself — send it as an{" "}
          <code className="rounded bg-muted px-1 font-mono">Authorization: Bearer</code> or{" "}
          <code className="rounded bg-muted px-1 font-mono">x-api-key</code> header. Browse the API
          at <code className="rounded bg-muted px-1 font-mono">/api/v1/docs</code>.
        </p>
      </div>

      {created ? (
        <div className="flex flex-col gap-2 rounded-lg border border-success/40 bg-success/5 p-3">
          <p className="text-caption text-muted-foreground">
            Copy your new token now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1 font-mono text-caption text-foreground">
              {created}
            </code>
            <IconButton
              aria-label="Copy token"
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(created).then(() => toast.success("Copied"));
              }}
            >
              <Copy className="size-4" />
            </IconButton>
          </div>
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setCreated(null)}>
            Done
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Token name (e.g. CI, laptop)"
            aria-label="Token name"
          />
          <Button
            size="sm"
            onClick={submit}
            loading={createToken.isPending}
            disabled={name.trim().length === 0}
          >
            Generate
          </Button>
        </div>
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional) — what is this token for?"
          aria-label="Token description"
        />
      </div>

      {tokens.isPending ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : tokens.isError ? (
        <ErrorState error={tokens.error} onRetry={() => void tokens.refetch()} />
      ) : (tokens.data ?? []).length === 0 ? (
        <EmptyState
          icon={<KeyRound />}
          title="No tokens yet"
          description="Generate a token above to access the API programmatically."
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(tokens.data ?? []).map((token) => (
            <li
              key={token.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <KeyRound className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-small font-medium text-foreground">
                  {token.name}
                </span>
                {token.description ? (
                  <span className="truncate text-caption text-muted-foreground">
                    {token.description}
                  </span>
                ) : null}
                <span className="truncate text-caption text-muted-foreground">
                  {token.prefix}… · created {relativeTime(token.created_at).relative}
                  {token.last_used_at
                    ? ` · used ${relativeTime(token.last_used_at).relative}`
                    : " · never used"}
                </span>
              </div>
              <IconButton
                aria-label={`Regenerate ${token.name}`}
                variant="ghost"
                size="sm"
                onClick={() =>
                  regenerateToken.mutate(token.id, {
                    onSuccess: (fresh) => setCreated(fresh.token),
                  })
                }
              >
                <RefreshCw className="size-4" />
              </IconButton>
              <IconButton
                aria-label={`Revoke ${token.name}`}
                variant="ghost"
                size="sm"
                onClick={() => revokeToken.mutate(token.id)}
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
