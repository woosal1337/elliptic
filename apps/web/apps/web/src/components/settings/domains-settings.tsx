"use client";

import { useState } from "react";
import { BadgeCheck, Copy, Globe, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button, IconButton, Input, Skeleton, toast } from "@elliptic/ui";
import {
  type OrgDomain,
  useAddDomain,
  useDeleteDomain,
  useDomains,
  useVerifyDomain,
} from "@/hooks/use-domain-queries";

function DomainRow({ orgId, domain }: { orgId: string; domain: OrgDomain }) {
  const verify = useVerifyDomain(orgId);
  const remove = useDeleteDomain(orgId);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Globe className="size-4 text-muted-foreground" />
        <span className="flex-1 text-small font-medium text-foreground">{domain.domain}</span>
        {domain.status === "verified" ? (
          <Badge variant="success" size="sm">
            <BadgeCheck className="size-3" />
            Verified
          </Badge>
        ) : (
          <Badge variant="warning" size="sm">
            Pending
          </Badge>
        )}
        <IconButton
          aria-label="Remove domain"
          variant="ghost"
          size="sm"
          onClick={() => remove.mutate(domain.id)}
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>
      {domain.status === "pending" ? (
        <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-2.5">
          <p className="text-caption text-muted-foreground">
            Add this TXT record to <span className="font-medium">{domain.domain}</span>, then verify:
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1 font-mono text-caption">
              {domain.txt_record}
            </code>
            <IconButton
              aria-label="Copy TXT record"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(domain.txt_record);
                toast.success("TXT record copied");
              }}
            >
              <Copy className="size-4" />
            </IconButton>
          </div>
          <div>
            <Button size="sm" variant="outline" onClick={() => verify.mutate(domain.id)} loading={verify.isPending}>
              <RefreshCw className="size-3.5" />
              Verify
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function DomainsSettings({ orgId }: { orgId: string }) {
  const domains = useDomains(orgId);
  const add = useAddDomain(orgId);
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim()) return;
    add.mutate(value.trim(), { onSuccess: () => setValue("") });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Verified domains</h2>
        <p className="text-caption text-muted-foreground">
          Verify ownership of an email domain via a DNS TXT record. A verified domain unlocks
          domain-gated SSO and is unique to this workspace.
        </p>
      </div>

      <div className="flex items-end gap-2">
        <Input
          placeholder="example.com"
          value={value}
          className="w-64"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        <Button size="sm" onClick={submit} loading={add.isPending} disabled={!value.trim()}>
          Add domain
        </Button>
      </div>

      {domains.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : (domains.data ?? []).length === 0 ? null : (
        <ul className="flex flex-col gap-2">
          {(domains.data ?? []).map((domain) => (
            <DomainRow key={domain.id} orgId={orgId} domain={domain} />
          ))}
        </ul>
      )}
    </section>
  );
}
