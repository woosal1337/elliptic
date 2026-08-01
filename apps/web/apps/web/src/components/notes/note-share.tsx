"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@elliptic/ui";
import type { NoteShareAccess } from "@/lib/types";
import { useOrgMembers } from "@/hooks/use-org-queries";
import { useNoteShares, useShareNote, useUnshareNote } from "@/hooks/use-note-queries";

const ACCESS_LEVELS: NoteShareAccess[] = ["view", "comment", "edit"];

export function NoteShareButton({ orgId, noteId }: { orgId: string; noteId: string }) {
  const [open, setOpen] = useState(false);
  const shares = useNoteShares(orgId, noteId, open);
  const orgMembers = useOrgMembers(orgId);
  const share = useShareNote(orgId, noteId);
  const unshare = useUnshareNote(orgId, noteId);
  const [selected, setSelected] = useState("");
  const [access, setAccess] = useState<NoteShareAccess>("view");

  const nameOf = useMemo(() => {
    const map = new Map((orgMembers.data ?? []).map((m) => [m.user_id, m.full_name]));
    return (id: string) => map.get(id) ?? "Unknown";
  }, [orgMembers.data]);

  const sharedIds = new Set((shares.data ?? []).map((s) => s.user_id));
  const available = (orgMembers.data ?? []).filter((m) => !sharedIds.has(m.user_id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton aria-label="Share page" variant="outline">
          <Users />
        </IconButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this page</DialogTitle>
          <DialogDescription>
            Grant specific members access to this private or shared page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-end gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1" aria-label="Member to share with">
              <SelectValue placeholder="Add a member…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={access} onValueChange={(value) => setAccess(value as NoteShareAccess)}>
            <SelectTrigger className="w-32" aria-label="Access level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCESS_LEVELS.map((level) => (
                <SelectItem key={level} value={level} className="capitalize">
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selected || share.isPending}
            onClick={() =>
              share.mutate(
                { user_id: selected, access },
                { onSuccess: () => setSelected("") }
              )
            }
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {shares.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (shares.data ?? []).length === 0 ? (
          <p className="text-caption text-muted-foreground">Not shared with anyone yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {(shares.data ?? []).map((entry) => (
              <li
                key={entry.id}
                className="group flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-small"
              >
                <Avatar name={nameOf(entry.user_id)} size="sm" />
                <span className="flex-1 truncate text-foreground">{nameOf(entry.user_id)}</span>
                <Select
                  value={entry.access}
                  onValueChange={(value) =>
                    share.mutate({ user_id: entry.user_id, access: value as NoteShareAccess })
                  }
                >
                  <SelectTrigger className="h-7 w-28" aria-label="Access level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map((level) => (
                      <SelectItem key={level} value={level} className="capitalize">
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <IconButton
                  aria-label="Remove access"
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => unshare.mutate(entry.user_id)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
