"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@elliptic/ui";
import { useCreateMeeting } from "@/hooks/use-meeting-queries";

export function NewMeetingDialog({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const createMeeting = useCreateMeeting(orgId);

  const submit = () => {
    if (title.trim().length === 0) return;
    createMeeting.mutate(
      { title: title.trim() },
      {
        onSuccess: (meeting) => {
          setOpen(false);
          setTitle("");
          router.push(`/app/${orgId}/meetings/${meeting.id}`);
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTitle("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          New meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">New meeting</DialogTitle>
          <DialogDescription className="text-small">
            Start a blank meeting for a live or ad-hoc session. Add notes as you go — no transcript
            required.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-meeting-title">Title</Label>
          <Input
            id="new-meeting-title"
            placeholder="Standup, customer call, 1:1…"
            value={title}
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            loading={createMeeting.isPending}
            disabled={title.trim().length === 0}
          >
            Create meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
