"use client";

import { useState } from "react";
import { ExternalLink, Link2, Paperclip, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Skeleton } from "@elliptic/ui";
import { FileUpload } from "@/components/storage/file-upload";
import { AttachmentList } from "@/components/storage/attachment-list";
import {
  type NoteEmbed,
  useCreateEmbed,
  useDeleteEmbed,
  useNoteAttachments,
  useNoteEmbeds,
} from "@/hooks/use-embed-queries";

const FILE_LIMIT = 100 * 1024 * 1024;

function EmbedCard({
  orgId,
  noteId,
  embed,
}: {
  orgId: string;
  noteId: string;
  embed: NoteEmbed;
}) {
  const remove = useDeleteEmbed(orgId, noteId);
  return (
    <div className="group flex flex-col gap-2 rounded-lg border border-border bg-surface p-2">
      {embed.kind === "iframe" && embed.iframe_url ? (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe
            src={embed.iframe_url}
            title={embed.title ?? embed.provider}
            className="size-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
      <div className="flex items-start gap-2">
        {embed.kind !== "iframe" ? (
          embed.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={embed.thumbnail_url} alt="" className="size-12 rounded object-cover" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded bg-muted text-muted-foreground">
              <Link2 className="size-4" />
            </span>
          )
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <a
            href={embed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 truncate text-small font-medium text-foreground hover:text-accent"
          >
            <span className="truncate">{embed.title ?? embed.url}</span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </a>
          {embed.description ? (
            <p className="line-clamp-2 text-caption text-muted-foreground">{embed.description}</p>
          ) : (
            <span className="truncate text-caption text-muted-foreground">{embed.provider}</span>
          )}
        </div>
        <IconButton
          aria-label="Remove embed"
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100"
          onClick={() => remove.mutate(embed.id)}
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

export function NoteAttachments({ orgId, noteId }: { orgId: string; noteId: string }) {
  const attachments = useNoteAttachments(orgId, noteId);
  const embeds = useNoteEmbeds(orgId, noteId);
  const createEmbed = useCreateEmbed(orgId, noteId);
  const [url, setUrl] = useState("");

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
            <Paperclip className="size-3.5" />
            Attachments
          </h3>
          <FileUpload
            orgId={orgId}
            entityType="note"
            entityId={noteId}
            maxBytes={FILE_LIMIT}
            label="Add"
            onUploaded={() => void attachments.refetch()}
          />
        </div>
        {attachments.isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : (attachments.data ?? []).length === 0 ? (
          <p className="text-caption text-muted-foreground">No files attached yet.</p>
        ) : (
          <AttachmentList orgId={orgId} attachments={attachments.data ?? []} />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          <Link2 className="size-3.5" />
          Embeds
        </h3>
        <div className="flex items-center gap-1.5">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste a YouTube, Figma, Loom or any link…"
            className="text-caption"
            onKeyDown={(event) => {
              if (event.key === "Enter" && url.trim()) {
                createEmbed.mutate(url.trim(), { onSuccess: () => setUrl("") });
              }
            }}
          />
          <Button
            size="sm"
            loading={createEmbed.isPending}
            disabled={!url.trim()}
            onClick={() => createEmbed.mutate(url.trim(), { onSuccess: () => setUrl("") })}
          >
            Add
          </Button>
        </div>
        {embeds.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          (embeds.data ?? []).map((embed) => (
            <EmbedCard key={embed.id} orgId={orgId} noteId={noteId} embed={embed} />
          ))
        )}
      </section>
    </aside>
  );
}
