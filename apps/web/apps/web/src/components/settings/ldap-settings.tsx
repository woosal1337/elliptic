"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Network, XCircle } from "lucide-react";
import { Button, Input, Skeleton } from "@elliptic/ui";
import {
  useDeleteLDAP,
  useLDAPConnection,
  useTestLDAP,
  useUpsertLDAP,
} from "@/hooks/use-ldap-queries";

const BLANK = {
  server_uri: "",
  use_tls: true,
  bind_dn: "",
  bind_password: "",
  search_base: "",
  search_filter: "(sAMAccountName={username})",
  attr_email: "mail",
  attr_first: "givenName",
  attr_last: "sn",
  enabled: true,
};

export function LdapSettings({ orgId }: { orgId: string }) {
  const connection = useLDAPConnection(orgId);
  const upsert = useUpsertLDAP(orgId);
  const remove = useDeleteLDAP(orgId);
  const test = useTestLDAP(orgId);
  const [form, setForm] = useState({ ...BLANK });

  useEffect(() => {
    if (connection.data) {
      setForm({ ...BLANK, ...connection.data, bind_password: "" });
    }
  }, [connection.data]);

  const field = (k: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: event.target.value }));

  const save = () =>
    upsert.mutate({ ...form, bind_password: form.bind_password.trim() || null });

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <Network className="size-4 text-muted-foreground" />
          LDAP / Active Directory
        </h2>
        <p className="text-caption text-muted-foreground">
          Authenticate members against your directory. Users are provisioned on first successful
          bind. The bind password is encrypted at rest and never returned.
        </p>
      </div>

      {connection.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-3">
          {[
            ["server_uri", "Server URI", "ldaps://ad.example.com"],
            ["bind_dn", "Bind DN", "cn=service,dc=example,dc=com"],
            ["search_base", "Search base", "dc=example,dc=com"],
            ["search_filter", "Search filter", "(sAMAccountName={username})"],
            ["attr_email", "Email attribute", "mail"],
          ].map(([k, label, ph]) => (
            <label key={k} className="flex flex-col gap-1 text-caption text-muted-foreground">
              {label}
              <Input
                value={form[k as keyof typeof form] as string}
                onChange={field(k as keyof typeof form)}
                placeholder={ph}
                className="font-mono text-caption"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-caption text-muted-foreground">
            Bind password {connection.data ? "(leave blank to keep current)" : ""}
            <Input type="password" value={form.bind_password} onChange={field("bind_password")} />
          </label>

          {test.data ? (
            <div
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-small ${
                test.data.ok
                  ? "border-success/40 bg-success/5 text-success"
                  : "border-danger/40 bg-danger-muted/30 text-danger"
              }`}
            >
              {test.data.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {test.data.message}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} loading={upsert.isPending} disabled={!form.server_uri.trim()}>
              Save LDAP
            </Button>
            {connection.data ? (
              <>
                <Button size="sm" variant="outline" onClick={() => test.mutate()} loading={test.isPending}>
                  Test connection
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate()} loading={remove.isPending}>
                  Remove
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
