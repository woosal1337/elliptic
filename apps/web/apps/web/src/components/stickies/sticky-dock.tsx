"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, StickyNote } from "lucide-react";
import { Button, IconButton, Textarea } from "@elliptic/ui";
import { useCreateSticky, useStickies } from "@/hooks/use-sticky-queries";
import { StickyConvertMenu } from "@/components/stickies/sticky-convert-menu";

export function StickyDock({ orgId }: { orgId: string }) {
  const stickies = useStickies(orgId);
  const createSticky = useCreateSticky(orgId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const latest = [...(stickies.data ?? [])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  )[0];
  const count = stickies.data?.length ?? 0;

  const add = () => {
    const content = draft.trim();
    if (!content) return;
    createSticky.mutate(
      { content, color: "yellow" },
      { onSuccess: () => setDraft("") }
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open stickies"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-small shadow-lg transition-colors hover:bg-muted"
      >
        <StickyNote className="size-4 text-amber-500" />
        {count > 0 ? <span className="tabular-nums text-muted-foreground">{count}</span> : null}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 flex w-72 flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-small font-medium text-foreground">
          <StickyNote className="size-4 text-amber-500" />
          Stickies
        </span>
        <div className="flex items-center gap-0.5">
          <Link
            href={`/app/${orgId}/stickies`}
            className="rounded px-1.5 py-0.5 text-caption text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            All
          </Link>
          <IconButton
            aria-label="Collapse stickies"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            <ChevronDown className="size-4" />
          </IconButton>
        </div>
      </div>

      {latest ? (
        <div className="flex items-start gap-1 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="line-clamp-4 flex-1 whitespace-pre-wrap text-caption text-foreground">
            {latest.content || "Empty sticky"}
          </p>
          <StickyConvertMenu orgId={orgId} stickyId={latest.id} />
        </div>
      ) : null}

      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            add();
          }
        }}
        placeholder="Quick note… (⌘↵ to add)"
        rows={2}
        className="resize-none text-small"
      />
      <Button size="sm" onClick={add} loading={createSticky.isPending} disabled={!draft.trim()}>
        <Plus className="size-3.5" />
        Add sticky
      </Button>
    </div>
  );
}
