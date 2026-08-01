"use client";

import { KeyRound } from "lucide-react";
import { Skeleton, Switch } from "@elliptic/ui";
import {
  type AuthProviderConfig,
  useAuthProviderConfig,
  useUpdateAuthProviders,
} from "@/hooks/use-auth-provider-queries";

const TOGGLES: { key: keyof AuthProviderConfig; label: string; hint: string }[] = [
  { key: "password_enabled", label: "Password", hint: "Email + password sign-in" },
  { key: "magic_code_enabled", label: "Magic code", hint: "Email one-time code sign-in" },
  { key: "google_enabled", label: "Google", hint: "Sign in with a Google account" },
  { key: "github_enabled", label: "GitHub", hint: "Sign in with a GitHub account" },
  { key: "allow_self_signup", label: "Allow self-signup", hint: "New users can register without an invite" },
  {
    key: "restrict_oauth_to_verified_domains",
    label: "Restrict OAuth to verified domains",
    hint: "Only allow social sign-in for verified email domains",
  },
];

export function AuthProvidersSettings({ orgId }: { orgId: string }) {
  const config = useAuthProviderConfig(orgId);
  const update = useUpdateAuthProviders(orgId);

  return (
    <section className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
          <KeyRound className="size-4 text-muted-foreground" />
          Sign-in providers
        </h2>
        <p className="text-caption text-muted-foreground">
          Choose which authentication methods your workspace offers and whether new users can
          self-register.
        </p>
      </div>

      {config.isPending || !config.data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {TOGGLES.map((toggle) => (
            <li key={toggle.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex flex-col">
                <span className="text-small text-foreground">{toggle.label}</span>
                <span className="text-caption text-muted-foreground">{toggle.hint}</span>
              </div>
              <Switch
                checked={config.data[toggle.key]}
                onCheckedChange={(checked) => update.mutate({ [toggle.key]: checked })}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
