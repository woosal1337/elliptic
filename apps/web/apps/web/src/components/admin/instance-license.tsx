"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Badge, Button, Skeleton, Textarea } from "@elliptic/ui";
import {
  useActivateLicense,
  useDelinkLicense,
  useInstanceLicense,
} from "@/hooks/use-instance-admin";

export function InstanceLicensePanel() {
  const license = useInstanceLicense();
  const activate = useActivateLicense();
  const delink = useDelinkLicense();
  const [token, setToken] = useState("");

  if (license.isPending) return <Skeleton className="h-40 w-full" />;

  return (
    <section className="flex flex-col gap-4 pt-4">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-muted-foreground" />
        <h2 className="text-small font-semibold text-foreground">License</h2>
        {license.data?.active ? (
          <Badge variant="success" size="sm">
            {license.data.plan} · {license.data.seats} seats
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm">
            Unlicensed
          </Badge>
        )}
      </div>

      {license.data?.active ? (
        <div className="flex flex-col gap-1 rounded-lg border border-border p-3 text-small">
          <span className="text-foreground">{license.data.licensee ?? "Licensed"}</span>
          <span className="text-caption text-muted-foreground">
            Plan {license.data.plan} · {license.data.seats} seats
            {license.data.expires_at ? ` · expires ${license.data.expires_at.slice(0, 10)}` : ""}
          </span>
          <div className="mt-1">
            <Button size="sm" variant="ghost" onClick={() => delink.mutate()} loading={delink.isPending}>
              Delink license
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-caption text-muted-foreground">Activate a license key</span>
        <Textarea
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste your offline license key…"
          rows={3}
          className="font-mono text-caption"
        />
        <div>
          <Button
            size="sm"
            disabled={!token.trim()}
            loading={activate.isPending}
            onClick={() => activate.mutate(token.trim(), { onSuccess: () => setToken("") })}
          >
            Activate
          </Button>
        </div>
      </div>
    </section>
  );
}
