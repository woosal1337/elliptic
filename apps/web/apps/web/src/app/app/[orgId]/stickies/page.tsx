"use client";

import { useParams } from "next/navigation";
import { Plus, StickyNote, Trash2 } from "lucide-react";
import { Button, EmptyState, IconButton, Skeleton, Textarea, cn } from "@elliptic/ui";
import type { Sticky } from "@/lib/types";
import { StickyConvertMenu } from "@/components/stickies/sticky-convert-menu";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/error-state";
import {
  useCreateSticky,
  useDeleteSticky,
  useStickies,
  useUpdateSticky,
} from "@/hooks/use-sticky-queries";

const COLORS = {
  yellow: { card: "bg-amber-100 dark:bg-amber-500/15 border-amber-300/60 dark:border-amber-500/25", dot: "bg-amber-400" },
  green: { card: "bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300/60 dark:border-emerald-500/25", dot: "bg-emerald-400" },
  blue: { card: "bg-sky-100 dark:bg-sky-500/15 border-sky-300/60 dark:border-sky-500/25", dot: "bg-sky-400" },
  pink: { card: "bg-pink-100 dark:bg-pink-500/15 border-pink-300/60 dark:border-pink-500/25", dot: "bg-pink-400" },
  purple: { card: "bg-violet-100 dark:bg-violet-500/15 border-violet-300/60 dark:border-violet-500/25", dot: "bg-violet-400" },
  orange: { card: "bg-orange-100 dark:bg-orange-500/15 border-orange-300/60 dark:border-orange-500/25", dot: "bg-orange-400" },
} satisfies Record<string, { card: string; dot: string }>;
const COLOR_ENTRIES = Object.entries(COLORS);

function StickyCard({ orgId, sticky }: { orgId: string; sticky: Sticky }) {
  const updateSticky = useUpdateSticky(orgId);
  const deleteSticky = useDeleteSticky(orgId);
  const meta =
    (COLORS as Record<string, { card: string; dot: string }>)[sticky.color] ?? COLORS.yellow;

  return (
    <div
      className={cn(
        "mb-4 flex break-inside-avoid flex-col gap-2 rounded-lg border p-3 shadow-xs",
        meta.card
      )}
    >
      <Textarea
        defaultValue={sticky.content}
        onBlur={(event) => {
          if (event.target.value !== sticky.content) {
            updateSticky.mutate({ stickyId: sticky.id, content: event.target.value });
          }
        }}
        placeholder="Jot something…"
        rows={4}
        aria-label="Sticky content"
        className="resize-none border-none bg-transparent p-0 text-small text-foreground shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {COLOR_ENTRIES.map(([key, value]) => (
            <button
              key={key}
              type="button"
              aria-label={`Color ${key}`}
              aria-pressed={sticky.color === key}
              onClick={() => updateSticky.mutate({ stickyId: sticky.id, color: key })}
              className={cn(
                "size-3.5 rounded-full ring-offset-1 transition-transform hover:scale-110",
                value.dot,
                sticky.color === key && "ring-2 ring-foreground/40"
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <StickyConvertMenu orgId={orgId} stickyId={sticky.id} />
          <IconButton
            aria-label="Delete sticky"
            variant="ghost"
            size="sm"
            onClick={() => deleteSticky.mutate(sticky.id)}
          >
            <Trash2 className="size-3.5" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default function StickiesPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const stickies = useStickies(orgId);
  const createSticky = useCreateSticky(orgId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Stickies"
        />
        <Button
          onClick={() => createSticky.mutate({ color: "yellow" })}
          loading={createSticky.isPending}
        >
          <Plus className="size-4" />
          New sticky
        </Button>
      </div>

      {stickies.isPending ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : stickies.isError ? (
        <ErrorState error={stickies.error} onRetry={() => void stickies.refetch()} />
      ) : (stickies.data ?? []).length === 0 ? (
        <EmptyState
          icon={<StickyNote />}
          title="No stickies yet"
          description="Add a sticky for fleeting thoughts, reminders, and snippets."
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {(stickies.data ?? []).map((sticky) => (
            <StickyCard key={sticky.id} orgId={orgId} sticky={sticky} />
          ))}
        </div>
      )}
    </div>
  );
}
