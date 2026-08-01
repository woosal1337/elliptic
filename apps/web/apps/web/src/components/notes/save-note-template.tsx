"use client";

import { useState } from "react";
import { LayoutTemplate } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Input,
} from "@elliptic/ui";
import { useSaveNoteAsTemplate } from "@/hooks/use-note-template-queries";

export function SaveNoteTemplateButton({ orgId, noteId }: { orgId: string; noteId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const save = useSaveNoteAsTemplate(orgId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton aria-label="Save as template" variant="outline">
          <LayoutTemplate />
        </IconButton>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>
            Reuse this page&apos;s title and content as a starting point for new pages.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            save.mutate(
              { noteId, name: name.trim() },
              {
                onSuccess: () => {
                  setOpen(false);
                  setName("");
                },
              }
            );
          }}
        >
          <Input
            placeholder="Template name (e.g. Weekly update)"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <DialogFooter>
            <Button type="submit" loading={save.isPending} disabled={!name.trim()}>
              Save template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
