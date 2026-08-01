"use client";

import { useMemo, useState } from "react";
import { Check, MessageSquare, Quote, Trash2 } from "lucide-react";
import { Button, IconButton, Skeleton, Textarea } from "@elliptic/ui";
import { FileUpload } from "@/components/storage/file-upload";
import { AttachmentList, PendingAttachmentChips } from "@/components/storage/attachment-list";
import type { UploadResult } from "@/hooks/use-storage-queries";
import { formatRelative } from "@/lib/format";
import {
  useAddNoteComment,
  useDeleteNoteComment,
  useNoteComments,
  useResolveNoteComment,
} from "@/hooks/use-note-comment-queries";
import { Markdown } from "@/components/notes/markdown";

type Filter = "active" | "resolved" | "all";

export function NoteComments({ orgId, noteId }: { orgId: string; noteId: string }) {
  const comments = useNoteComments(orgId, noteId);
  const add = useAddNoteComment(orgId, noteId);
  const resolve = useResolveNoteComment(orgId, noteId);
  const remove = useDeleteNoteComment(orgId, noteId);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<
    { objectId: string; filename: string; kind: "image" | "file" }[]
  >([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("active");

  const captureSelection = () => {
    const text = window.getSelection()?.toString().trim();
    if (text) setAnchor(text.slice(0, 280));
  };

  const rows = useMemo(() => {
    const all = (comments.data ?? []).filter((c) => c.parent_id === null);
    if (filter === "active") return all.filter((c) => !c.resolved_at);
    if (filter === "resolved") return all.filter((c) => c.resolved_at);
    return all;
  }, [comments.data, filter]);

  const submit = () => {
    if (!body.trim() && pending.length === 0) return;
    add.mutate(
      { content: body.trim(), anchor, attachmentIds: pending.map((a) => a.objectId) },
      {
        onSuccess: () => {
          setBody("");
          setAnchor(null);
          setPending([]);
        },
      }
    );
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          <MessageSquare className="size-3.5" />
          Comments
        </h3>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {(["active", "resolved", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded px-1.5 py-0.5 text-caption capitalize transition-colors ${
                filter === value
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-2">
        {anchor ? (
          <div className="flex items-start gap-1.5 rounded border-l-2 border-accent bg-muted/50 px-2 py-1 text-caption text-muted-foreground">
            <Quote className="mt-0.5 size-3 shrink-0" />
            <span className="line-clamp-2 flex-1 italic">{anchor}</span>
            <button type="button" onClick={() => setAnchor(null)} aria-label="Remove anchor">
              ✕
            </button>
          </div>
        ) : null}
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a comment…"
          className="min-h-[3rem] text-small"
        />
        <PendingAttachmentChips
          items={pending}
          onRemove={(objectId) => setPending((c) => c.filter((a) => a.objectId !== objectId))}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={captureSelection} title="Anchor to selected text">
              <Quote className="size-3.5" />
              Anchor
            </Button>
            <FileUpload
              orgId={orgId}
              entityType="comment"
              label=""
              onUploaded={(result: UploadResult) =>
                setPending((c) => [
                  ...c,
                  { objectId: result.objectId, filename: result.filename, kind: result.kind },
                ])
              }
            />
          </div>
          <Button size="sm" onClick={submit} disabled={(!body.trim() && pending.length === 0) || add.isPending}>
            Comment
          </Button>
        </div>
      </div>

      {comments.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-caption text-muted-foreground/70">No {filter} comments.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((comment) => (
            <li
              key={comment.id}
              className="group flex flex-col gap-1 rounded-lg border border-border bg-surface p-2.5"
            >
              {comment.anchor ? (
                <div className="flex items-start gap-1.5 rounded border-l-2 border-accent/60 bg-muted/40 px-2 py-1 text-caption italic text-muted-foreground">
                  <Quote className="mt-0.5 size-3 shrink-0" />
                  <span className="line-clamp-2">{comment.anchor}</span>
                </div>
              ) : null}
              <Markdown source={comment.content} orgId={orgId} />
              <AttachmentList orgId={orgId} attachments={comment.attachments ?? []} />
              <div className="flex items-center justify-between text-caption text-muted-foreground">
                <span>{formatRelative(comment.created_at)}</span>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <IconButton
                    aria-label={comment.resolved_at ? "Reopen" : "Resolve"}
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      resolve.mutate({ commentId: comment.id, resolved: !comment.resolved_at })
                    }
                  >
                    <Check className={`size-4 ${comment.resolved_at ? "text-success" : ""}`} />
                  </IconButton>
                  <IconButton
                    aria-label="Delete comment"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate(comment.id)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
