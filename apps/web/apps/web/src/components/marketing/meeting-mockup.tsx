import { Avatar, Badge, cn } from "@elliptic/ui";
import { ArrowUp, Link2, Sparkles, UserRound } from "lucide-react";

interface Segment {
  speaker: string;
  time: string;
  text: string;
}

interface SummaryLine {
  text: string;
  source: string;
}

const SEGMENTS: Segment[] = [
  {
    speaker: "Ada Cole",
    time: "00:42",
    text: "Let's lock the import path before we touch the summary prompt.",
  },
  {
    speaker: "Theo Vance",
    time: "01:15",
    text: "Folio exports clean markdown, so the parser stays thin.",
  },
  {
    speaker: "Ines Park",
    time: "02:03",
    text: "Agreed. I'll own the BYOK key rotation piece this sprint.",
  },
];

const SUMMARY: SummaryLine[] = [
  { text: "Transcript import ships before the summary prompt rewrite.", source: "00:42" },
  { text: "Folio markdown export keeps the parser lightweight.", source: "01:15" },
  { text: "Ines owns BYOK key rotation for this sprint.", source: "02:03" },
];

const CHIPS = ["Decisions", "Action items", "Risks", "Owners"];

export function MeetingMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-danger" />
          <span className="truncate text-small font-semibold tracking-tight text-foreground">
            Weekly platform sync
          </span>
          <Badge variant="neutral" size="sm" className="font-mono">
            18:24
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-mono-label text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-foreground/60" />
            Human
          </span>
          <span className="flex items-center gap-1.5 text-mono-label text-accent">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            AI
          </span>
        </div>
      </div>

      <div className="grid bg-surface lg:grid-cols-3">
        <div className="flex flex-col gap-4 border-b border-border p-4 lg:col-span-2 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 text-mono-label text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden="true" />
            Transcript
          </div>
          {SEGMENTS.map((segment, index) => (
            <div key={`${segment.time}-${index}`} className="flex gap-3">
              <Avatar name={segment.speaker} size="sm" tone="auto" className="mt-0.5" />
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-caption font-semibold text-foreground">
                    {segment.speaker}
                  </span>
                  <span className="font-mono text-mono-label text-muted-foreground">
                    {segment.time}
                  </span>
                </div>
                <p className="border-l-2 border-foreground/20 pl-3 text-small leading-relaxed text-muted-foreground">
                  {segment.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-1 flex-col gap-3 rounded-lg border border-accent-subtle bg-accent-muted/40 p-4">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="size-3.5" aria-hidden="true" />
              <span className="font-mono text-mono-label">AI summary</span>
            </div>
            <ul className="flex flex-col gap-3">
              {SUMMARY.map((line) => (
                <li key={line.text} className="flex flex-col gap-1.5">
                  <div className="flex gap-2.5 text-small leading-snug text-foreground">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span>{line.text}</span>
                  </div>
                  <span
                    className={cn(
                      "ml-4 inline-flex w-fit items-center gap-1 rounded-full border border-accent-subtle",
                      "bg-background/60 px-1.5 py-0.5 font-mono text-mono-label text-accent"
                    )}
                  >
                    <Link2 className="size-2.5" aria-hidden="true" />
                    {line.source}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-border bg-background px-2 py-1 text-mono-label text-muted-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2",
                "text-caption text-muted-foreground"
              )}
            >
              <Sparkles className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">Ask the meeting anything</span>
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <ArrowUp className="size-3" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
