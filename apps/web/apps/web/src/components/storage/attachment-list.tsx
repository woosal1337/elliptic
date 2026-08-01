"use client";

import { Download, FileText, ImageIcon } from "lucide-react";
import { Skeleton } from "@elliptic/ui";
import type { Attachment } from "@/lib/types";
import { openStoredObject, useObjectUrl } from "@/hooks/use-storage-queries";

function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageAttachment({ orgId, attachment }: { orgId: string; attachment: Attachment }) {
  const url = useObjectUrl(orgId, attachment.id);
  if (url.isPending) return <Skeleton className="h-32 w-44 rounded-md" />;
  if (!url.data) return null;
  return (
    <button
      type="button"
      onClick={() => void openStoredObject(orgId, attachment.id)}
      className="group relative overflow-hidden rounded-md border border-border"
      title={attachment.filename}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url.data.download_url}
        alt={attachment.filename}
        className="max-h-48 max-w-xs object-cover transition-transform group-hover:scale-[1.02]"
      />
    </button>
  );
}

export function AttachmentList({
  orgId,
  attachments,
}: {
  orgId: string;
  attachments: Attachment[];
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((attachment) =>
        attachment.kind === "image" ? (
          <ImageAttachment key={attachment.id} orgId={orgId} attachment={attachment} />
        ) : (
          <button
            key={attachment.id}
            type="button"
            onClick={() => void openStoredObject(orgId, attachment.id)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-caption text-foreground transition-colors hover:bg-muted"
            title={`Download ${attachment.filename}`}
          >
            <FileText className="size-3.5 text-muted-foreground" />
            <span className="max-w-[14rem] truncate">{attachment.filename}</span>
            {attachment.size_bytes ? (
              <span className="text-muted-foreground">{humanSize(attachment.size_bytes)}</span>
            ) : null}
            <Download className="size-3 text-muted-foreground" />
          </button>
        )
      )}
    </div>
  );
}

export function PendingAttachmentChips({
  items,
  onRemove,
}: {
  items: { objectId: string; filename: string; kind: "image" | "file" }[];
  onRemove: (objectId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.objectId}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-caption text-foreground"
        >
          {item.kind === "image" ? (
            <ImageIcon className="size-3 text-muted-foreground" />
          ) : (
            <FileText className="size-3 text-muted-foreground" />
          )}
          <span className="max-w-[10rem] truncate">{item.filename}</span>
          <button
            type="button"
            onClick={() => onRemove(item.objectId)}
            className="text-muted-foreground hover:text-danger"
            aria-label={`Remove ${item.filename}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
