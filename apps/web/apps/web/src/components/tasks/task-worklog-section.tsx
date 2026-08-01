"use client";

import { useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Badge, Button, IconButton, Input, Skeleton } from "@elliptic/ui";
import { formatDate } from "@/lib/format";
import {
  formatMinutes,
  useCreateWorklog,
  useDeleteWorklog,
  useWorklogs,
} from "@/hooks/use-worklog-queries";

function parseDuration(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  const hm = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/.exec(value);
  if (hm && (hm[1] || hm[2])) {
    const hours = hm[1] ? parseFloat(hm[1]) : 0;
    const minutes = hm[2] ? parseInt(hm[2], 10) : 0;
    return Math.round(hours * 60 + minutes);
  }
  const bare = Number(value);
  return Number.isFinite(bare) && bare > 0 ? Math.round(bare) : null;
}

export function TaskWorklogSection({ orgId, taskId }: { orgId: string; taskId: string }) {
  const worklogs = useWorklogs(orgId, taskId);
  const createWorklog = useCreateWorklog(orgId, taskId);
  const deleteWorklog = useDeleteWorklog(orgId, taskId);
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    const minutes = parseDuration(duration);
    if (!minutes) return;
    createWorklog.mutate(
      { minutes, note: note.trim() || null },
      {
        onSuccess: () => {
          setDuration("");
          setNote("");
        },
      }
    );
  };

  const data = worklogs.data;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="1h 30m"
          aria-label="Duration"
          className="w-24"
        />
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What did you work on? (optional)"
          aria-label="Worklog note"
          className="min-w-0 flex-1"
        />
        <Button
          size="sm"
          onClick={submit}
          loading={createWorklog.isPending}
          disabled={parseDuration(duration) === null}
        >
          <Plus className="size-4" />
          Log
        </Button>
      </div>

      {worklogs.isPending ? (
        <Skeleton className="h-12 w-full rounded-md" />
      ) : data && data.entries.length > 0 ? (
        <>
          <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <Clock className="size-3.5" />
            <span className="font-medium text-foreground">{formatMinutes(data.total_minutes)}</span>
            logged total
          </div>
          <ul className="flex flex-col gap-1">
            {data.entries.map((entry) => (
              <li
                key={entry.id}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-small hover:bg-surface"
              >
                <span className="tabular font-medium text-foreground">
                  {formatMinutes(entry.minutes)}
                </span>
                {entry.approval_status !== "approved" ? (
                  <Badge variant={entry.approval_status === "pending" ? "warning" : "danger"}>
                    {entry.approval_status}
                  </Badge>
                ) : null}
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {entry.note ?? entry.user_name ?? "—"}
                </span>
                <span className="shrink-0 text-caption text-muted-foreground/70">
                  {formatDate(entry.logged_at)}
                </span>
                <IconButton
                  aria-label="Delete worklog"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  disabled={deleteWorklog.isPending}
                  onClick={() => deleteWorklog.mutate(entry.id)}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-caption text-muted-foreground">No time logged yet.</p>
      )}
    </div>
  );
}
