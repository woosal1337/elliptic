import { Avatar, Badge, cn } from "@elliptic/ui";
import { FileText, Users } from "lucide-react";

const PAGES = ["Launch runbook", "Architecture", "BYOK & keys", "On-call"];

function Line({ className }: { className?: string }) {
  return <div className={cn("h-2.5 rounded bg-foreground/15", className)} />;
}

function Cursor({ name, tone }: { name: string; tone: "accent" | "info" }) {
  return (
    <span
      className={cn("relative mx-1 inline-block h-4 w-0.5", tone === "accent" ? "bg-accent" : "bg-info")}
    >
      <span
        className={cn(
          "absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-mono-label",
          tone === "accent" ? "bg-accent text-accent-foreground" : "bg-info text-info-foreground",
        )}
      >
        {name}
      </span>
    </span>
  );
}

export function NotesMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-danger" />
          <span className="truncate text-small font-semibold tracking-tight text-foreground">
            Launch runbook
          </span>
          <Badge variant="neutral" size="sm" className="font-mono">
            Wiki
          </Badge>
        </div>
        <div className="flex items-center -space-x-2">
          <Avatar name="Ada Cole" size="sm" tone="auto" className="ring-2 ring-background" />
          <Avatar name="Theo Vance" size="sm" tone="auto" className="ring-2 ring-background" />
          <span className="z-10 grid size-6 place-items-center rounded-full border border-border bg-surface font-mono text-mono-label text-muted-foreground">
            +3
          </span>
        </div>
      </div>

      <div className="grid bg-surface lg:grid-cols-4">
        <aside className="hidden flex-col gap-1 border-r border-border p-3 lg:flex">
          {PAGES.map((page, index) => (
            <span
              key={page}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-caption",
                index === 0 ? "bg-accent-muted/50 text-foreground" : "text-muted-foreground",
              )}
            >
              <FileText className="size-3.5 shrink-0" aria-hidden="true" />
              {page}
            </span>
          ))}
        </aside>

        <div className="flex flex-col gap-4 p-5 lg:col-span-3">
          <div className="h-5 w-2/3 rounded bg-foreground/80" />
          <div className="flex flex-col gap-3">
            <Line className="w-full" />
            <Line className="w-11/12" />
            <div className="flex items-center">
              <Line className="w-2/5" />
              <Cursor name="Ada" tone="accent" />
              <Line className="w-1/5" />
            </div>
            <Line className="w-10/12" />
            <div className="flex items-center">
              <Line className="w-1/3" />
              <Cursor name="Theo" tone="info" />
              <Line className="w-2/5" />
            </div>
            <Line className="w-3/4" />
          </div>
          <div className="mt-1 flex items-center gap-2 font-mono text-mono-label text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />5 editing now, synced
          </div>
        </div>
      </div>
    </div>
  );
}
