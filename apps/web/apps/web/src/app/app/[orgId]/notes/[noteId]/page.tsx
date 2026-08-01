"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Eye,
  Lock,
  LockOpen,
  Maximize2,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Minimize2,
  Pencil,
  StretchHorizontal,
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  cn,
} from "@elliptic/ui";
import { formatRelative } from "@/lib/format";
import {
  useDeleteNote,
  useDuplicateNote,
  useNote,
  useSetNoteLifecycle,
  useUpdateNote,
} from "@/hooks/use-note-queries";
import { ErrorState } from "@/components/error-state";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { NoteEditor, NoteRenderer } from "@/components/notes/note-editor";
import { CoeditingPresence } from "@/components/notes/coediting-presence";
import { useNoteCollab } from "@/hooks/use-note-collab";
import { useMe } from "@/hooks/use-auth-queries";
import { NoteOutline } from "@/components/notes/note-outline";
import { NoteAttachments } from "@/components/notes/note-attachments";
import { NoteComments } from "@/components/notes/note-comments";
import { NoteWorkItems } from "@/components/notes/note-work-items";
import { NoteAiSidecar } from "@/components/notes/note-ai-sidecar";
import { NoteHistoryButton } from "@/components/notes/note-history";
import { NoteExportMenu } from "@/components/notes/note-export-menu";
import { SaveNoteTemplateButton } from "@/components/notes/save-note-template";
import { NoteShareButton } from "@/components/notes/note-share";
import { NotePublishButton } from "@/components/notes/note-publish-button";

export default function NoteEditorPage() {
  const { orgId, noteId } = useParams<{ orgId: string; noteId: string }>();
  const router = useRouter();
  const note = useNote(orgId, noteId);
  const me = useMe();
  const updateNote = useUpdateNote(orgId);
  const saveNote = updateNote.mutate;
  const deleteNote = useDeleteNote(orgId);
  const duplicateNote = useDuplicateNote(orgId);

  const setLifecycle = useSetNoteLifecycle(orgId, noteId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [fullWidth, setFullWidth] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showWorkItems, setShowWorkItems] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const collab = useNoteCollab(noteId, me.data?.id, me.data?.full_name, !preview && !focusMode);

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
  const sidecarOpen = showAttachments || showAi || showWorkItems || showComments;

  return (
    <div
      className={cn(
        "mx-auto flex w-full justify-center gap-8 px-6 py-8 transition-[max-width]",
        focusMode ? "max-w-3xl" : "max-w-6xl"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-4",
          fullWidth ? "flex-1" : "w-full max-w-3xl"
        )}
      >
      {focusMode ? (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setFocusMode(false)}>
            <Minimize2 className="size-4" />
            Exit focus
          </Button>
        </div>
      ) : null}
      {!focusMode ? (
        <Breadcrumbs
          items={[
            { label: "Pages", href: `/app/${orgId}/notes` },
            { label: note.data.title || "Untitled" },
          ]}
        />
      ) : null}
      {!focusMode ? (
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
        <div className="flex items-center gap-2">
          <Select
            value={note.data.visibility}
            onValueChange={(value) =>
              setLifecycle.mutate({ visibility: value as "public" | "private" | "shared" })
            }
          >
            <SelectTrigger className="h-8 w-28" aria-label="Page visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="shared">Shared</SelectItem>
            </SelectContent>
          </Select>
          {note.data.visibility !== "public" ? (
            <NoteShareButton orgId={orgId} noteId={noteId} />
          ) : null}
          <NotePublishButton orgId={orgId} noteId={noteId} />
          <IconButton
            aria-label={preview ? "Edit" : "Preview"}
            variant="outline"
            onClick={() => setPreview((value) => !value)}
          >
            {preview ? <Pencil /> : <Eye />}
          </IconButton>
          <IconButton
            aria-label="Comments"
            variant={showComments ? "primary" : "outline"}
            onClick={() => {
              setShowComments((value) => !value);
              setShowWorkItems(false);
              setShowAttachments(false);
            }}
          >
            <MessageSquare />
          </IconButton>
          <IconButton
            aria-label="Page assistant"
            variant={showAi ? "primary" : "outline"}
            onClick={() => {
              setShowAi((value) => !value);
              setShowComments(false);
              setShowWorkItems(false);
              setShowAttachments(false);
            }}
          >
            <Sparkles />
          </IconButton>
          <NoteExportMenu orgId={orgId} noteId={noteId} />
          <NoteHistoryButton orgId={orgId} noteId={noteId} />
          <SaveNoteTemplateButton orgId={orgId} noteId={noteId} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton aria-label="More page actions" variant="outline">
                <MoreHorizontal />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onSelect={() => {
                  setShowWorkItems((value) => !value);
                  setShowComments(false);
                  setShowAttachments(false);
                }}
              >
                <ListChecks /> Work items
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setShowAttachments((value) => !value);
                  setShowComments(false);
                  setShowWorkItems(false);
                  setShowAi(false);
                }}
              >
                <Paperclip /> Attachments &amp; embeds
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setFullWidth((value) => !value)}>
                <StretchHorizontal /> {fullWidth ? "Standard width" : "Full width"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFocusMode(true)}>
                <Maximize2 /> Focus mode
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setLifecycle.mutate({ locked: !note.data.locked })}>
                {note.data.locked ? <Lock /> : <LockOpen />}{" "}
                {note.data.locked ? "Unlock page" : "Lock page"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLifecycle.mutate({ archived: !note.data.archived_at })}
              >
                {note.data.archived_at ? <ArchiveRestore /> : <Archive />}{" "}
                {note.data.archived_at ? "Unarchive page" : "Archive page"}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={duplicateNote.isPending}
                onSelect={() =>
                  duplicateNote.mutate(noteId, {
                    onSuccess: (copy) => {
                      router.push(`/app/${orgId}/notes/${copy.id}`);
                    },
                  })
                }
              >
                <Copy /> Duplicate page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
      </div>
      ) : null}
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
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          {preview ? (
            <Card>
              <CardContent className="p-6">
                <NoteRenderer source={body} />
              </CardContent>
            </Card>
          ) : (
            <>
              {collab ? (
                <div className="mb-2 flex justify-end">
                  <CoeditingPresence provider={collab.provider} />
                </div>
              ) : null}
              <NoteEditor
                key={collab ? "collab" : "solo"}
                value={body}
                onChange={setBody}
                orgId={orgId}
                collab={collab ?? undefined}
              />
            </>
          )}
        </div>
        {!focusMode && sidecarOpen ? (
          <div className="sticky top-8 hidden h-fit lg:block">
            {showAttachments ? (
              <NoteAttachments orgId={orgId} noteId={noteId} />
            ) : showAi ? (
              <NoteAiSidecar
                orgId={orgId}
                noteId={noteId}
                content={body}
                onInsert={(text) => setBody((current) => (current ? `${current}\n\n${text}` : text))}
              />
            ) : showWorkItems ? (
              <NoteWorkItems
                orgId={orgId}
                noteId={noteId}
                projectId={note.data?.project_id ?? null}
              />
            ) : (
              <NoteComments orgId={orgId} noteId={noteId} />
            )}
          </div>
        ) : null}
      </div>
      </div>
      {!focusMode ? (
        <aside className="sticky top-8 hidden h-fit w-56 shrink-0 xl:block">
          <NoteOutline content={body} />
        </aside>
      ) : null}
    </div>
  );
}
