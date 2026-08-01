"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckSquare, Gavel, Send, ShieldOff, Sparkles } from "lucide-react";
import {
  Badge,
  Button,
  Logo,
  Skeleton,
  Textarea,
  cn,
} from "@elliptic/ui";
import { usePublicMeetingChat, usePublicMeetingShare } from "@/hooks/use-public-share-queries";
import { formatTimestamp } from "@/lib/format";

interface Turn {
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
}

export default function PublicMeetingSharePage() {
  const { token } = useParams<{ token: string }>();
  const share = usePublicMeetingShare(token);
  const chat = usePublicMeetingChat(token);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");

  const ask = () => {
    const question = input.trim();
    if (question.length === 0 || chat.isPending) return;
    const history: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(history);
    setInput("");
    chat.mutate(
      history.map(({ role, content }) => ({ role, content })),
      {
        onSuccess: (result) =>
          setTurns((prev) => [
            ...prev,
            { role: "assistant", content: result.reply, grounded: result.grounded },
          ]),
      }
    );
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo />
        <Badge variant="outline">Shared meeting</Badge>
      </header>

      {share.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : share.isError ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface px-6 py-16 text-center">
          <ShieldOff className="size-8 text-muted-foreground" />
          <p className="text-small font-medium text-foreground">This link is no longer available</p>
          <p className="text-caption text-muted-foreground">
            The owner may have revoked access. Ask them to share it again.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-h2 font-semibold tracking-[-0.02em] text-foreground">
              {share.data.meeting_title}
            </h1>
          </div>

          {share.data.summary ? (
            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
                <Sparkles className="size-4 text-accent" />
                Summary
              </h2>
              <p className="whitespace-pre-wrap text-small leading-relaxed text-foreground">
                {share.data.summary}
              </p>
            </section>
          ) : null}

          {share.data.action_items.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
                <CheckSquare className="size-4 text-accent" />
                Action items
              </h2>
              <ul className="flex flex-col gap-1.5">
                {share.data.action_items.map((item, index) => (
                  <li key={index} className="flex gap-2 text-small text-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {share.data.decisions.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-h4 font-semibold text-foreground">
                <Gavel className="size-4 text-accent" />
                Decisions
              </h2>
              <ul className="flex flex-col gap-1.5">
                {share.data.decisions.map((item, index) => (
                  <li key={index} className="flex gap-2 text-small text-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {share.data.include_transcript && share.data.transcript.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-h4 font-semibold text-foreground">Transcript</h2>
              <ol className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-surface p-3">
                {share.data.transcript.map((segment) => (
                  <li key={segment.id} className="grid grid-cols-[3.5rem_1fr] gap-3">
                    <span className="text-right font-mono text-caption tabular-nums text-muted-foreground">
                      {formatTimestamp(segment.start_seconds)}
                    </span>
                    <div>
                      <span className="text-caption font-semibold text-accent">{segment.speaker}</span>
                      <p className="text-small text-foreground">{segment.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
              <Sparkles className="size-4 text-accent" />
              Ask about this meeting
            </h2>
            <div className="flex flex-col gap-3">
              {turns.map((turn, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex max-w-[85%] flex-col",
                    turn.role === "user" ? "items-end self-end" : "items-start self-start"
                  )}
                >
                  <p
                    className={cn(
                      "whitespace-pre-wrap rounded-lg px-3 py-2 text-small",
                      turn.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-muted/40 text-foreground"
                    )}
                  >
                    {turn.content}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                rows={2}
                value={input}
                placeholder="Ask the AI about this meeting…"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    ask();
                  }
                }}
              />
              <Button onClick={ask} loading={chat.isPending} disabled={input.trim().length === 0}>
                <Send className="size-4" />
                Ask
              </Button>
            </div>
            <p className="text-caption text-muted-foreground">
              AI-generated answers are scoped to this meeting. Verify anything important.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
