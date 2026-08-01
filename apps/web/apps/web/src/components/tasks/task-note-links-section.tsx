"use client";

import { FileText, X } from "lucide-react";
import {
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import { useNotes } from "@/hooks/use-note-queries";
import { useLinkNote, useTaskNoteLinks, useUnlinkNote } from "@/hooks/use-task-queries";

export function TaskNoteLinksSection({ orgId, taskId }: { orgId: string; taskId: string }) {
  const links = useTaskNoteLinks(orgId, taskId);
  const notes = useNotes(orgId);
  const linkNote = useLinkNote(orgId, taskId);
  const unlinkNote = useUnlinkNote(orgId, taskId);

  const linkedIds = new Set((links.data ?? []).map((link) => link.note_id));
  const candidates = (notes.data ?? []).filter((note) => !linkedIds.has(note.id));

  return (
    <div className="flex flex-col gap-2">
      {links.isPending ? (
        <Skeleton className="h-10 w-full rounded-lg" />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(links.data ?? []).map((link) => (
            <li key={link.note_id} className="flex items-center gap-1.5">
              <a
                href={`/app/${orgId}/notes/${link.note_id}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-2 transition-colors hover:border-border-strong hover:bg-muted/40"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-small text-foreground">
                  {link.title}
                </span>
              </a>
              <IconButton
                aria-label={`Unlink ${link.title}`}
                variant="ghost"
                size="sm"
                onClick={() => unlinkNote.mutate(link.note_id)}
              >
                <X className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {candidates.length > 0 ? (
        <Select onValueChange={(noteId) => linkNote.mutate(noteId)}>
          <SelectTrigger
            className="h-8 w-auto self-start text-caption text-muted-foreground"
            aria-label="Link a note"
          >
            <SelectValue placeholder="Link a note…" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((note) => (
              <SelectItem key={note.id} value={note.id}>
                {note.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
