"use client";

import { useState } from "react";
import { Copy, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Badge, Button, IconButton, Input, Skeleton, toast } from "@elliptic/ui";
import {
  useMintScimToken,
  useRevokeScimToken,
  useScimStatus,
} from "@/hooks/use-scim-queries";

export function ScimSettings({ orgId }: { orgId: string }) {
  const status = useScimStatus(orgId);
  const mint = useMintScimToken(orgId);
  const revoke = useRevokeScimToken(orgId);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const baseUrl =
    typeof window === "undefined"
      ? status.data?.base_url ?? ""
      : `${window.location.origin}${status.data?.base_url ?? ""}`;

  const generate = () =>
    mint.mutate(undefined, { onSuccess: (result) => setFreshToken(result.token) });

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <ShieldCheck className="size-4 text-muted-foreground" />
          SCIM provisioning
        </h2>
        <p className="text-caption text-muted-foreground">
          Connect your IdP (Okta, Entra ID, …) to automatically provision and deactivate members
          via SCIM 2.0. Point it at the base URL below with the bearer token.
        </p>
      </div>

      {status.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            SCIM base URL
            <div className="flex items-center gap-2">
              <Input readOnly value={baseUrl} className="font-mono text-caption" />
              <IconButton
                aria-label="Copy base URL"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(baseUrl);
                  toast.success("Base URL copied");
                }}
              >
                <Copy className="size-4" />
              </IconButton>
            </div>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-small text-muted-foreground">Token:</span>
            {status.data?.configured ? (
              <Badge variant="success" size="sm">
                Active{status.data.prefix ? ` · ${status.data.prefix}…` : ""}
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Not configured
              </Badge>
            )}
          </div>

          {freshToken ? (
            <div className="flex flex-col gap-1.5 rounded-md border border-warning/40 bg-warning-muted/30 p-3">
              <span className="text-caption font-medium text-foreground">
                Copy this token now — it won&apos;t be shown again.
              </span>
              <div className="flex items-center gap-2">
                <Input readOnly value={freshToken} className="font-mono text-caption" />
                <IconButton
                  aria-label="Copy token"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(freshToken);
                    toast.success("Token copied");
                  }}
                >
                  <Copy className="size-4" />
                </IconButton>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={generate} loading={mint.isPending}>
              <RefreshCw className="size-3.5" />
              {status.data?.configured ? "Rotate token" : "Generate token"}
            </Button>
            {status.data?.configured ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  revoke.mutate();
                  setFreshToken(null);
                }}
                loading={revoke.isPending}
              >
                <Trash2 className="size-3.5" />
                Revoke
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
