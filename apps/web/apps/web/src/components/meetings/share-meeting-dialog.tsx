"use client";

import { useState } from "react";
import { Check, Copy, Link2, Share2, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Switch,
  Skeleton,
  toast,
} from "@elliptic/ui";
import {
  useCreateMeetingShare,
  useMeetingShare,
  useUpdateMeetingShare,
} from "@/hooks/use-meeting-queries";
import { shareMeetingUrl } from "@/lib/share";

export function ShareMeetingDialog({ orgId, meetingId }: { orgId: string; meetingId: string }) {
  const [open, setOpen] = useState(false);
  const share = useMeetingShare(orgId, meetingId);
  const create = useCreateMeetingShare(orgId, meetingId);
  const update = useUpdateMeetingShare(orgId, meetingId);
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = share.data && !share.data.revoked ? share.data : null;
  const url =
    active && typeof window !== "undefined"
      ? shareMeetingUrl(window.location.origin, active.token)
      : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Share2 className="size-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Share this meeting</DialogTitle>
          <DialogDescription className="text-small">
            Anyone with the link sees the summary, action items, and decisions, and can ask the AI
            about the meeting. The raw transcript stays private unless you include it.
          </DialogDescription>
        </DialogHeader>

        {share.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : active ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-muted-foreground" />
              <Input readOnly value={url} aria-label="Share link" className="font-mono text-caption" />
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="flex flex-col">
                <Label htmlFor="share-transcript">Include transcript</Label>
                <span className="text-caption text-muted-foreground">
                  Let guests read the verbatim record, not just the summary.
                </span>
              </div>
              <Switch
                id="share-transcript"
                checked={active.include_transcript}
                disabled={update.isPending}
                onCheckedChange={(checked) => update.mutate({ include_transcript: checked })}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground hover:text-danger"
              disabled={update.isPending}
              onClick={() => update.mutate({ revoked: true }, { onSuccess: () => setOpen(false) })}
            >
              <Trash2 className="size-4" />
              Revoke link
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <Label htmlFor="share-new-transcript">Include transcript</Label>
              <Switch
                id="share-new-transcript"
                checked={includeTranscript}
                onCheckedChange={setIncludeTranscript}
              />
            </div>
            <Button
              loading={create.isPending}
              onClick={() => create.mutate({ include_transcript: includeTranscript })}
            >
              <Link2 className="size-4" />
              Create share link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
