"use client";

import { useState } from "react";
import { History, RotateCcw } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Skeleton,
} from "@elliptic/ui";
import { formatRelative } from "@/lib/format";
import { useNoteVersions, useRestoreNoteVersion } from "@/hooks/use-note-queries";

export function NoteHistoryButton({ orgId, noteId }: { orgId: string; noteId: string }) {
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const versions = useNoteVersions(orgId, noteId, open);
  const restore = useRestoreNoteVersion(orgId, noteId);

  const rows = versions.data ?? [];
  const preview = rows.find((v) => v.id === previewId) ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPreviewId(null);
      }}
    >
      <DialogTrigger asChild>
        <IconButton aria-label="Version history" variant="outline">
          <History />
        </IconButton>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Each edit is snapshotted automatically. Restoring is non-destructive — the current
            version is saved first.
          </DialogDescription>
        </DialogHeader>
        {versions.isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-caption text-muted-foreground">
            No earlier versions yet — they appear here after the page is edited.
          </p>
        ) : (
          <div className="grid grid-cols-[16rem_1fr] gap-4">
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto pr-1">
              {rows.map((version) => (
                <li key={version.id}>
                  <button
                    type="button"
                    onClick={() => setPreviewId(version.id)}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-small transition-colors ${
                      previewId === version.id
                        ? "border-accent bg-muted"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="truncate font-medium text-foreground">{version.title}</span>
                    <span className="text-caption text-muted-foreground">
                      {formatRelative(version.created_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex min-h-48 flex-col gap-3">
              {preview ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-small font-medium text-foreground">{preview.title}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={restore.isPending}
                      onClick={() =>
                        restore.mutate(preview.id, { onSuccess: () => setOpen(false) })
                      }
                    >
                      <RotateCcw className="size-4" />
                      Restore this version
                    </Button>
                  </div>
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface p-3 font-mono text-caption text-muted-foreground">
                    {preview.content || "(empty)"}
                  </pre>
                </>
              ) : (
                <p className="text-caption text-muted-foreground">
                  Select a version to preview it.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
