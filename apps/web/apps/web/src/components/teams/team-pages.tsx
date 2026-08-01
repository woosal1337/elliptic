"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { Button, Card, Input, Skeleton } from "@elliptic/ui";
import { useCreateNote, useTeamNotes } from "@/hooks/use-note-queries";

export function TeamPages({
  orgId,
  teamId,
  canManage,
}: {
  orgId: string;
  teamId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const notes = useTeamNotes(orgId, teamId);
  const createNote = useCreateNote(orgId);
  const [title, setTitle] = useState("");

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    createNote.mutate(
      { title: trimmed, team_id: teamId },
      {
        onSuccess: (note) => {
          setTitle("");
          router.push(`/app/${orgId}/notes/${note.id}`);
        },
      }
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-small font-semibold text-foreground">Team pages</h2>
        <p className="text-caption text-muted-foreground">
          A shared knowledge hub of pages owned by this team.
        </p>
      </div>

      {canManage ? (
        <div className="flex items-center gap-2">
          <Input
            value={title}
            placeholder="New page title…"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
          <Button size="sm" onClick={submit} disabled={!title.trim() || createNote.isPending}>
            <Plus className="size-4" />
            New page
          </Button>
        </div>
      ) : null}

      {notes.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : (notes.data ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-small text-muted-foreground">
          No team pages yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(notes.data ?? []).map((note) => (
            <Link key={note.id} href={`/app/${orgId}/notes/${note.id}`} className="group">
              <Card className="flex items-center gap-2 p-3 transition-colors group-hover:border-input">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-small text-foreground">{note.title}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
