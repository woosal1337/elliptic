"use client";

import { useState } from "react";
import Link from "next/link";
import { Hash, MessageSquare, Send } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import {
  useSendMeetingToSlack,
  useSlackChannels,
  useSlackConnection,
} from "@/hooks/use-integration-queries";

export function SlackShareDialog({ orgId, meetingId }: { orgId: string; meetingId: string }) {
  const [open, setOpen] = useState(false);
  const connection = useSlackConnection(orgId);
  const connected = connection.data?.connected ?? false;
  const channels = useSlackChannels(orgId, open && connected);
  const send = useSendMeetingToSlack(orgId, meetingId);
  const [channelId, setChannelId] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <MessageSquare className="size-4" />
          Send to Slack
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Send to Slack</DialogTitle>
          <DialogDescription className="text-small">
            Post the summary and action items to a channel, with a link teammates can use to ask the
            AI about this meeting.
          </DialogDescription>
        </DialogHeader>

        {connection.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : !connected ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5">
            <p className="text-small text-foreground">Slack isn&rsquo;t connected for this org yet.</p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/${orgId}/settings`}>
                <MessageSquare className="size-4" />
                Connect Slack
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger aria-label="Slack channel">
                <SelectValue placeholder="Choose a channel…" />
              </SelectTrigger>
              <SelectContent>
                {(channels.data ?? []).map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    <span className="flex items-center gap-1.5">
                      <Hash className="size-3.5 text-muted-foreground" />
                      {channel.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              loading={send.isPending}
              disabled={channelId.length === 0}
              onClick={() =>
                send.mutate({ channel_id: channelId }, { onSuccess: () => setOpen(false) })
              }
            >
              <Send className="size-4" />
              Post summary
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
