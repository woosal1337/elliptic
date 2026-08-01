"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button, Input, Skeleton } from "@elliptic/ui";
import { useDeleteSSO, useSSOConnection, useUpsertSSO } from "@/hooks/use-sso-queries";
import { GroupMappings } from "@/components/settings/group-mappings";

export function SSOSettings({ orgId }: { orgId: string }) {
  const connection = useSSOConnection(orgId);
  const upsert = useUpsertSSO(orgId);
  const remove = useDeleteSSO(orgId);
  const [form, setForm] = useState({
    domain: "",
    issuer: "",
    client_id: "",
    client_secret: "",
    redirect_uri: "",
    enabled: true,
  });

  useEffect(() => {
    const data = connection.data;
    if (data) {
      setForm({
        domain: data.domain,
        issuer: data.issuer,
        client_id: data.client_id,
        client_secret: "",
        redirect_uri: data.redirect_uri,
        enabled: data.enabled,
      });
    } else if (typeof window !== "undefined") {
      setForm((f) => ({ ...f, redirect_uri: `${window.location.origin}/auth/sso/callback` }));
    }
  }, [connection.data]);

  const field = (k: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: event.target.value }));

  const save = () => {
    upsert.mutate({
      domain: form.domain.trim(),
      issuer: form.issuer.trim(),
      client_id: form.client_id.trim(),
      client_secret: form.client_secret.trim() || null,
      redirect_uri: form.redirect_uri.trim(),
      enabled: form.enabled,
    });
  };

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <KeyRound className="size-4 text-muted-foreground" />
          Single sign-on (OIDC)
        </h2>
        <p className="text-caption text-muted-foreground">
          Connect an OpenID Connect identity provider. Members with an email on the configured
          domain can sign in via your IdP; new users are provisioned on first login.
        </p>
      </div>

      {connection.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            Email domain
            <Input value={form.domain} onChange={field("domain")} placeholder="acme.com" />
          </label>
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            Issuer URL
            <Input value={form.issuer} onChange={field("issuer")} placeholder="https://idp.example.com" />
          </label>
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            Client ID
            <Input value={form.client_id} onChange={field("client_id")} />
          </label>
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            Client secret {connection.data ? "(leave blank to keep current)" : ""}
            <Input type="password" value={form.client_secret} onChange={field("client_secret")} />
          </label>
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            Redirect URI
            <Input value={form.redirect_uri} onChange={field("redirect_uri")} className="font-mono text-caption" />
          </label>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} loading={upsert.isPending} disabled={!form.domain.trim()}>
              Save SSO
            </Button>
            {connection.data ? (
              <Button size="sm" variant="ghost" onClick={() => remove.mutate()} loading={remove.isPending}>
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      )}
          <GroupMappings orgId={orgId} />
    </section>
  );
}
