"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Skeleton,
  cn,
} from "@elliptic/ui";
import { formatRelative } from "@/lib/format";
import { useDeleteNote, useNote, useUpdateNote } from "@/hooks/use-note-queries";
import { ErrorState } from "@/components/error-state";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteOutline } from "@/components/notes/note-outline";

export default function NoteEditorPage() {
  const { orgId, noteId } = useParams<{ orgId: string; noteId: string }>();
  const router = useRouter();
  const note = useNote(orgId, noteId);
  const updateNote = useUpdateNote(orgId);
  const saveNote = updateNote.mutate;
  const deleteNote = useDeleteNote(orgId);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const savedRef = useRef({ title: "", content: "" });
  const latestRef = useRef({ title: "", content: "" });
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (note.isSuccess && !hydrated) {
      setTitle(note.data.title);
      setBody(note.data.content);
      savedRef.current = { title: note.data.title, content: note.data.content };
      setHydrated(true);
      hydratedRef.current = true;
    }
  }, [note.isSuccess, note.data, hydrated]);

  latestRef.current = { title, content: body };
  if (note.isSuccess) {
    savedRef.current = { title: note.data.title, content: note.data.content };
  }

  const dirty =
    hydrated && (title !== note.data?.title || body !== note.data?.content);

  useEffect(() => {
    if (!hydrated || !dirty) {
      return;
    }
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      return;
    }
    const id = setTimeout(() => {
      saveNote({ noteId, title: trimmed, content: body });
    }, 800);
    return () => clearTimeout(id);
  }, [title, body, dirty, hydrated, noteId, saveNote]);

  useEffect(() => {
    return () => {
      if (!hydratedRef.current) {
        return;
      }
      const { title: t, content: c } = latestRef.current;
      const trimmed = t.trim();
      if (
        trimmed.length > 0 &&
        (t !== savedRef.current.title || c !== savedRef.current.content)
      ) {
        saveNote({ noteId, title: trimmed, content: c });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  if (note.isPending) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (note.isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <ErrorState error={note.error} onRetry={() => void note.refetch()} />
      </div>
    );
  }

  const saving = updateNote.isPending || dirty;

  return (
    <div className="mx-auto flex w-full max-w-6xl justify-center gap-8 px-6 py-8">
      <div className="flex w-full max-w-3xl min-w-0 flex-col gap-4">
        <Breadcrumbs
          items={[
            { label: "Pages", href: `/app/${orgId}/notes` },
            { label: note.data.title || "Untitled" },
          ]}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                saving ? "bg-warning" : "bg-success"
              )}
            />
            {saving ? "Saving…" : `Saved ${formatRelative(note.data.updated_at)}`}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton aria-label="More page actions" variant="outline">
                <MoreHorizontal />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="text-danger focus:bg-danger-muted focus:text-danger"
                onSelect={() =>
                  deleteNote.mutate(noteId, {
                    onSuccess: () => {
                      router.push(`/app/${orgId}/notes`);
                    },
                  })
                }
              >
                <Trash2 /> Delete page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1">
          <Input
            aria-label="Page icon"
            defaultValue={note.data.icon ?? ""}
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next !== (note.data?.icon ?? "")) {
                updateNote.mutate({ noteId, icon: next || null });
              }
            }}
            maxLength={8}
            placeholder="📄"
            className="h-auto w-12 border-transparent bg-transparent px-2 py-1.5 text-center text-h3 shadow-none hover:border-input"
          />
          <Input
            aria-label="Note title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-auto flex-1 border-transparent bg-transparent px-2 py-1.5 text-h3 font-semibold tracking-[-0.015em] shadow-none hover:border-input"
            placeholder="Untitled"
          />
        </div>
        <NoteEditor value={body} onChange={setBody} />
      </div>
      <aside className="sticky top-8 hidden h-fit w-56 shrink-0 xl:block">
        <NoteOutline content={body} />
      </aside>
    </div>
  );
}
