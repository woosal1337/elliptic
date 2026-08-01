import * as React from "react";
import { Badge, cn } from "@elliptic/ui";
import { Bot, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

interface ProviderKey {
  provider: string;
  glyph: React.ComponentType<{ className?: string }>;
  last4: string;
  usage: string;
  isDefault: boolean;
  isLive: boolean;
}

const KEYS: ProviderKey[] = [
  {
    provider: "Anthropic",
    glyph: Sparkles,
    last4: "4f2a",
    usage: "1,204 runs · this month",
    isDefault: true,
    isLive: true,
  },
  {
    provider: "OpenAI",
    glyph: Bot,
    last4: "9c01",
    usage: "318 runs · this month",
    isDefault: false,
    isLive: true,
  },
];

export function ByokMockup() {
  return (
    <div className="flex flex-col gap-5 p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md border border-border bg-surface text-muted-foreground">
            <KeyRound className="size-4" aria-hidden="true" />
          </span>
          <span className="text-small font-semibold tracking-tight text-foreground">
            Provider keys
          </span>
        </div>
        <Badge variant="success" dot>
          <ShieldCheck className="size-3" aria-hidden="true" />
          On your keys
        </Badge>
      </header>

      <div className="flex flex-col gap-2.5">
        {KEYS.map((key) => {
          const Glyph = key.glyph;
          return (
            <div
              key={key.last4}
              className={cn(
                "flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-3.5 shadow-xs transition-colors",
                "hover:border-border-strong"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-background text-foreground">
                  <Glyph className="size-4" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-small font-medium text-foreground">{key.provider}</span>
                    {key.isDefault ? <Badge variant="accent">Default</Badge> : null}
                  </div>
                  <span className="font-mono text-caption text-muted-foreground">
                    sk-···{key.last4}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden font-mono text-caption text-muted-foreground sm:inline">
                  {key.usage}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    key.isLive ? "bg-success" : "bg-muted-foreground"
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-3.5 text-caption text-muted-foreground">
        <ShieldCheck className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
        <span>
          <span className="font-mono text-foreground">AES-256-GCM</span>, last4 only. Keys never
          leave your org.
        </span>
      </div>
    </div>
  );
}
