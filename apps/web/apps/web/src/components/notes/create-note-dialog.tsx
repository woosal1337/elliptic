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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elliptic/ui";
import { useCreateNote } from "@/hooks/use-note-queries";
import { useNoteTemplates } from "@/hooks/use-note-template-queries";

const BLANK = "__blank__";

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
  const [templateId, setTemplateId] = useState(BLANK);
  const createNote = useCreateNote(orgId);
  const templates = useNoteTemplates(orgId, projectId);

  const onPickTemplate = (id: string) => {
    setTemplateId(id);
    if (id === BLANK) return;
    const template = (templates.data ?? []).find((t) => t.id === id);
    if (template && title.trim().length === 0) setTitle(template.title.trim());
  };

  const submit = () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    const template = (templates.data ?? []).find((t) => t.id === templateId);
    createNote.mutate(
      { title: trimmed, content: template?.content, project_id: projectId ?? null },
      {
        onSuccess: (note) => {
          setOpen(false);
          setTitle("");
          setTemplateId(BLANK);
          router.push(`/app/${orgId}/notes/${note.id}`);
        },
      }
    );
  };

  const templateOptions = templates.data ?? [];

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
          {templateOptions.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label>Start from</Label>
              <Select value={templateId} onValueChange={onPickTemplate}>
                <SelectTrigger aria-label="Template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BLANK}>Blank page</SelectItem>
                  {templateOptions.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
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
