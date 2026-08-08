"use client";

import * as React from "react";
import { ChevronRight, FileText, Folder, FolderPlus, Home, MoveRight } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Skeleton,
} from "@elliptic/ui";
import { relativeTime } from "@/lib/format";
import { useCreateNote, useNotes, useUpdateNote } from "@/hooks/use-note-queries";
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

/** Walk a note up to the root, nearest ancestor last. */
function trailFor(noteId: string | null, byId: Map<string, Note>): Note[] {
  const trail: Note[] = [];
  let cursor = noteId;
  const guard = new Set<string>();
  while (cursor) {
    const node = byId.get(cursor);
    // A parent can be missing when it is filtered out of this view, and a cycle
    // should never exist, but neither is worth hanging the page over.
    if (!node || guard.has(cursor)) break;
    guard.add(cursor);
    trail.unshift(node);
    cursor = node.parent_id;
  }
  return trail;
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
  const createNote = useCreateNote(orgId);
  const updateNote = useUpdateNote(orgId);
  const [folderId, setFolderId] = React.useState<string | null>(null);

  const data = React.useMemo(() => notes.data ?? [], [notes.data]);
  const source = React.useMemo(
    () => (wikiOnly ? data.filter((note) => note.project_id === null) : data),
    [data, wikiOnly]
  );
  const byId = React.useMemo(
    () => new Map(source.map((note) => [note.id, note])),
    [source]
  );

  // The open folder can disappear underneath us — archived, deleted, or moved
  // out of this view — so fall back to the root rather than showing nothing.
  const currentId = folderId && byId.has(folderId) ? folderId : null;
  const trail = React.useMemo(() => trailFor(currentId, byId), [currentId, byId]);

  const { folders, files } = React.useMemo(() => {
    const here = source.filter((note) => (note.parent_id ?? null) === currentId);
    return {
      // By name, numerically, so the date-named week folders read 07-20,
      // 07-27, 08-03 instead of whatever order the API returned. Files keep
      // that order, which is recency and is what you want for a document.
      folders: here
        .filter((n) => n.is_folder)
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true })),
      files: here.filter((n) => !n.is_folder),
    };
  }, [source, currentId]);

  // Somewhere to move a note to: every folder except the one it is already in,
  // itself, and anything filed beneath it — moving a folder into its own child
  // would detach the whole branch from the tree.
  const moveTargets = React.useCallback(
    (note: Note) => {
      const banned = new Set<string>([note.id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const candidate of source) {
          if (candidate.parent_id && banned.has(candidate.parent_id) && !banned.has(candidate.id)) {
            banned.add(candidate.id);
            grew = true;
          }
        }
      }
      return source.filter((n) => n.is_folder && !banned.has(n.id) && n.id !== note.parent_id);
    },
    [source]
  );

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

  const createFolder = () => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    createNote.mutate({
      title: name.trim(),
      is_folder: true,
      parent_id: currentId,
      project_id: projectId ?? null,
    });
  };

  const move = (note: Note, target: string | null) =>
    updateNote.mutate({ noteId: note.id, parent_id: target });

  const rowMenu = (note: Note) => {
    const targets = moveTargets(note);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Move ${note.title}`}
            onClick={(event) => event.preventDefault()}
          >
            <MoveRight className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {note.parent_id ? (
            <DropdownMenuItem onSelect={() => move(note, null)}>
              <Home className="size-4" />
              All notes
            </DropdownMenuItem>
          ) : null}
          {targets.length === 0 && !note.parent_id ? (
            <DropdownMenuItem disabled>No other folders yet</DropdownMenuItem>
          ) : null}
          {targets.map((target) => (
            <DropdownMenuItem key={target.id} onSelect={() => move(note, target.id)}>
              <Folder className="size-4" />
              {target.title}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const card = (note: Note) => {
    const updated = relativeTime(note.updated_at);
    const childCount = source.filter((n) => n.parent_id === note.id).length;
    return (
      <li key={note.id} className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <ContentCard
            href={note.is_folder ? undefined : `/app/${orgId}/notes/${note.id}`}
            onClick={note.is_folder ? () => setFolderId(note.id) : undefined}
            title={note.title}
            summary={note.is_folder ? null : noteExcerpt(note)}
            tag={
              note.is_folder
                ? { label: childCount === 1 ? "1 item" : `${childCount} items` }
                : { label: "Note" }
            }
            timestamp={{
              label: `Updated ${updated.relative}`,
              title: updated.title,
              iso: note.updated_at,
            }}
            leading={
              <span className="flex size-9 items-center justify-center rounded-md bg-subtle text-muted-foreground">
                {note.icon ? (
                  <span className="text-lg">{note.icon}</span>
                ) : note.is_folder ? (
                  <Folder className="size-4" />
                ) : (
                  <FileText className="size-4" />
                )}
              </span>
            }
          />
        </div>
        {rowMenu(note)}
      </li>
    );
  };

  const isEmptyHere = folders.length === 0 && files.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <nav aria-label="Folder path" className="flex min-w-0 items-center gap-1 text-caption">
          <button
            type="button"
            onClick={() => setFolderId(null)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            {wikiOnly ? "All pages" : "All notes"}
          </button>
          {trail.map((node, index) => (
            <span key={node.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              <button
                type="button"
                onClick={() => setFolderId(node.id)}
                className={
                  index === trail.length - 1
                    ? "truncate font-medium text-foreground"
                    : "truncate text-muted-foreground transition-colors hover:text-foreground"
                }
                aria-current={index === trail.length - 1 ? "page" : undefined}
              >
                {node.title}
              </button>
            </span>
          ))}
        </nav>
        <Button variant="ghost" size="sm" onClick={createFolder} className="shrink-0">
          <FolderPlus className="size-4" />
          New folder
        </Button>
      </div>

      {isEmptyHere ? (
        <EmptyState
          icon={currentId ? <Folder /> : <FileText />}
          title={
            currentId
              ? "This folder is empty"
              : wikiOnly
                ? "No wiki pages yet"
                : "No notes yet"
          }
          description={
            currentId
              ? "Anything you create while you are in here is filed here."
              : emptyDescription
          }
          action={emptyAction}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {folders.map(card)}
          {files.map(card)}
        </ul>
      )}
    </div>
  );
}
