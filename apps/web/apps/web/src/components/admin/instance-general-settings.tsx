"use client";

import { Input, Switch } from "@companyos/ui";
import {
  type InstanceSettings,
  useUpdateInstanceSettings,
} from "@/hooks/use-instance-admin";

export function InstanceGeneralSettings({ settings }: { settings: InstanceSettings }) {
  const update = useUpdateInstanceSettings();

  return (
    <section className="flex flex-col gap-4 pt-4">
      <label className="flex flex-col gap-1 text-caption text-muted-foreground">
        Instance name
        <Input
          key={settings.instance_name}
          defaultValue={settings.instance_name}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (next && next !== settings.instance_name) update.mutate({ instance_name: next });
          }}
          className="max-w-sm"
        />
      </label>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-small text-foreground">Allow workspace creation</span>
          <span className="text-caption text-muted-foreground">
            When off, only instance admins can create new workspaces.
          </span>
        </div>
        <Switch
          checked={settings.allow_workspace_creation}
          onCheckedChange={(checked) => update.mutate({ allow_workspace_creation: checked })}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-small text-foreground">Usage telemetry</span>
          <span className="text-caption text-muted-foreground">
            Share anonymous usage metrics to help improve Elliptic.
          </span>
        </div>
        <Switch
          checked={settings.telemetry_enabled}
          onCheckedChange={(checked) => update.mutate({ telemetry_enabled: checked })}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-small text-foreground">Air-gapped mode</span>
          <span className="text-caption text-muted-foreground">
            Block all outbound network calls (AI web search, etc.). Use local models via a custom
            base URL.
          </span>
        </div>
        <Switch
          checked={settings.air_gapped}
          onCheckedChange={(checked) => update.mutate({ air_gapped: checked })}
        />
      </div>

      <label className="flex flex-col gap-1 text-caption text-muted-foreground">
        Email from-address
        <Input
          key={settings.email_from ?? ""}
          defaultValue={settings.email_from ?? ""}
          onBlur={(event) =>
            update.mutate({ email_from: event.target.value.trim() || null })
          }
          placeholder="no-reply@example.com"
          className="max-w-sm"
        />
      </label>
    </section>
  );
}
