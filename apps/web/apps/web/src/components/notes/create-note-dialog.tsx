"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@elliptic/ui";
import { useCreateNote } from "@/hooks/use-note-queries";

export function CreateNoteDialog({
  orgId,
  projectId,
  open: controlledOpen,
  onOpenChange,
}: {
  orgId: string;
  projectId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [title, setTitle] = useState("");
  const createNote = useCreateNote(orgId);

  const submit = () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    createNote.mutate(
      { title: trimmed, project_id: projectId ?? null },
      {
        onSuccess: (note) => {
          setOpen(false);
          setTitle("");
          router.push(`/app/${orgId}/notes/${note.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New note
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New note</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              placeholder="Q3 launch checklist"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" loading={createNote.isPending} disabled={title.trim().length === 0}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
