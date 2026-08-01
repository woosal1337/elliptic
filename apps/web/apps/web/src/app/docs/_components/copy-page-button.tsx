"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@elliptic/ui";

export function CopyPageButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy this page as Markdown"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5",
        "text-caption font-medium text-muted-foreground transition-colors duration-150",
        "hover:border-input hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-success" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {copied ? "Copied" : "Copy as Markdown"}
    </button>
  );
}
