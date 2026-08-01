import { Avatar, Badge, cn } from "@elliptic/ui";
import { Sparkles } from "lucide-react";

interface Event {
  actor: string;
  agent?: boolean;
  action: string;
  target: string;
  time: string;
}

const EVENTS: Event[] = [
  { actor: "release-bot", agent: true, action: "moved", target: "DEMO-42 to In Progress", time: "2s" },
  { actor: "Ada Cole", action: "commented on", target: "DEMO-41", time: "1m" },
  { actor: "summarizer", agent: true, action: "summarized", target: "Weekly platform sync", time: "3m" },
  { actor: "Theo Vance", action: "closed", target: "DEMO-39", time: "6m" },
  { actor: "intake-bot", agent: true, action: "triaged", target: "3 inbound requests", time: "9m" },
];

export function ActivityMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-danger" />
          <span className="truncate text-small font-semibold tracking-tight text-foreground">
            Activity
          </span>
          <Badge variant="neutral" size="sm" className="font-mono">
            DEMO
          </Badge>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-mono-label text-success">
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-success" />
          Live
        </span>
      </div>

      <ul className="flex flex-col bg-surface">
        {EVENTS.map((event, index) => (
          <li
            key={`${event.target}-${index}`}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            {event.agent ? (
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-accent-subtle bg-accent-muted text-accent">
                <Sparkles className="size-3.5" aria-hidden="true" />
              </span>
            ) : (
              <Avatar name={event.actor} size="sm" tone="auto" />
            )}
            <div className="min-w-0 flex-1 text-small leading-snug">
              <span className={cn("font-medium", event.agent ? "text-accent" : "text-foreground")}>
                {event.actor}
              </span>{" "}
              <span className="text-muted-foreground">{event.action}</span>{" "}
              <span className="font-medium text-foreground">{event.target}</span>
            </div>
            <span className="shrink-0 font-mono text-mono-label text-muted-foreground">{event.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
