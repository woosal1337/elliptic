"use client";

import type { ReactElement } from "react";
import { Kbd, Tooltip, TooltipContent, TooltipTrigger } from "@elliptic/ui";
import { formatKeysForDisplay } from "@/lib/keyboard";

export function ShortcutTooltip({
  label,
  keys,
  side = "bottom",
  children,
}: {
  label: string;
  keys?: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactElement;
}) {
  const tokens = keys ? formatKeysForDisplay(keys) : [];
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="flex items-center gap-2">
        <span>{label}</span>
        {tokens.length > 0 ? (
          <span className="flex items-center gap-1">
            {tokens.map((token, index) => (
              <Kbd
                key={`${label}-${index}`}
                className="h-4 border-background/30 bg-background/15 text-background"
              >
                {token}
              </Kbd>
            ))}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
