"use client";

import { FileText } from "lucide-react";
import { EmptyState, Skeleton } from "@elliptic/ui";
import { relativeTime } from "@/lib/format";
import { useNotes } from "@/hooks/use-note-queries";
import { ErrorState } from "@/components/error-state";
import { ContentCard } from "@/components/content-card";
import type { Note } from "@/lib/types";

function noteExcerpt(note: Note): string | null {
  for (const rawLine of note.content.split("\n")) {
    const line = rawLine
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^\s*\d+\.\s+/, "")
      .replace(/^\s*>\s?/, "")
      .replace(/[*_`~]/g, "")
      .trim();
    if (line.length > 0 && line !== note.title) return line;
  }
  return null;
}

export function NoteList({
  orgId,
  projectId,
  emptyAction,
  wikiOnly = false,
  emptyDescription = "Capture decisions, specs, and context here so the whole org can find them later.",
}: {
  orgId: string;
  projectId?: string;
  emptyAction?: React.ReactNode;
  wikiOnly?: boolean;
  emptyDescription?: string;
}) {
  const notes = useNotes(orgId, projectId);

  if (notes.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (notes.isError) {
    return <ErrorState error={notes.error} onRetry={() => void notes.refetch()} />;
  }

  const source = wikiOnly
    ? notes.data.filter((note) => note.project_id === null)
    : notes.data;

  if (source.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title={wikiOnly ? "No wiki pages yet" : "No notes yet"}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const idSet = new Set(source.map((note) => note.id));
  const childrenByParent = new Map<string, Note[]>();
  const roots: Note[] = [];
  for (const note of source) {
    if (note.parent_id && idSet.has(note.parent_id)) {
      const list = childrenByParent.get(note.parent_id) ?? [];
      list.push(note);
      childrenByParent.set(note.parent_id, list);
    } else {
      roots.push(note);
    }
  }

  const renderNote = (note: Note, depth: number): React.ReactNode => {
    const updated = relativeTime(note.updated_at);
    const children = childrenByParent.get(note.id) ?? [];
    return (
      <li key={note.id} className="flex flex-col gap-2">
        <div style={depth > 0 ? { marginLeft: `${depth * 1.5}rem` } : undefined}>
          <ContentCard
            href={`/app/${orgId}/notes/${note.id}`}
            title={note.title}
            summary={noteExcerpt(note)}
            tag={children.length > 0 ? { label: `${children.length} sub-pages` } : { label: "Note" }}
            timestamp={{
              label: `Updated ${updated.relative}`,
              title: updated.title,
              iso: note.updated_at,
            }}
            leading={
              note.icon ? (
                <span className="flex size-9 items-center justify-center rounded-md bg-subtle text-lg">
                  {note.icon}
                </span>
              ) : (
                <span className="flex size-9 items-center justify-center rounded-md bg-subtle text-muted-foreground">
                  <FileText className="size-4" />
                </span>
              )
            }
          />
        </div>
        {children.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {children.map((child) => renderNote(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  return <ul className="flex flex-col gap-2">{roots.map((note) => renderNote(note, 0))}</ul>;
}
