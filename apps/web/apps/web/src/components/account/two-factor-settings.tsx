"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, Input } from "@elliptic/ui";
import {
  useDisable2fa,
  useEnable2fa,
  useMe,
  useSetup2fa,
} from "@/hooks/use-auth-queries";

export function TwoFactorSettings() {
  const me = useMe();
  const setup = useSetup2fa();
  const enable = useEnable2fa();
  const disable = useDisable2fa();
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const enabled = me.data?.totp_enabled === true;

  const startSetup = () => {
    setup.mutate(undefined, { onSuccess: (data) => setSecret(data.secret) });
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className={`size-4 ${enabled ? "text-success" : "text-muted-foreground"}`} />
        <h2 className="text-small font-semibold text-foreground">Two-factor authentication</h2>
      </div>
      <p className="text-caption text-muted-foreground">
        Add a time-based one-time code from an authenticator app as a second factor at sign-in.
      </p>

      {enabled ? (
        <div className="flex flex-wrap items-end gap-2">
          <span className="rounded-md bg-success-muted px-2 py-1 text-caption font-medium text-success">
            Enabled
          </span>
          <Input
            placeholder="Code to disable"
            value={code}
            className="w-44"
            onChange={(event) => setCode(event.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            loading={disable.isPending}
            disabled={code.length < 6}
            onClick={() => disable.mutate(code, { onSuccess: () => setCode("") })}
          >
            Disable
          </Button>
        </div>
      ) : secret ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-caption text-muted-foreground">
              Add this secret to your authenticator app:
            </span>
            <code className="select-all rounded-md bg-muted px-3 py-2 font-mono text-small text-foreground">
              {secret}
            </code>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              placeholder="6-digit code"
              value={code}
              className="w-44"
              inputMode="numeric"
              onChange={(event) => setCode(event.target.value)}
            />
            <Button
              size="sm"
              loading={enable.isPending}
              disabled={code.length < 6}
              onClick={() =>
                enable.mutate(code, {
                  onSuccess: () => {
                    setSecret(null);
                    setCode("");
                  },
                })
              }
            >
              Verify &amp; enable
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" loading={setup.isPending} onClick={startSetup}>
          Set up two-factor
        </Button>
      )}
    </section>
  );
}
