"use client";

import { useState } from "react";
import { CornerDownLeft, Sparkles } from "lucide-react";
import { Button, Skeleton, Textarea } from "@elliptic/ui";
import { useDocAssist } from "@/hooks/use-ai-queries";

const PRESETS = [
  { label: "Summarize", prompt: "Summarize this page in a few bullet points." },
  { label: "Action items", prompt: "Extract the action items from this page as a checklist." },
  { label: "Improve writing", prompt: "Rewrite this page to be clearer and more concise." },
];

export function NoteAiSidecar({
  orgId,
  noteId,
  content,
  onInsert,
}: {
  orgId: string;
  noteId: string;
  content: string;
  onInsert: (text: string) => void;
}) {
  const assist = useDocAssist(orgId);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const ask = (prompt: string) => {
    if (!prompt.trim()) return;
    assist.mutate(
      { note_id: noteId, content, question: prompt.trim() },
      { onSuccess: (result) => setAnswer(result.answer) }
    );
  };

  return (
    <aside className="flex w-80 flex-col gap-3 rounded-xl border border-border bg-surface p-3">
      <h2 className="flex items-center gap-2 text-small font-semibold text-foreground">
        <Sparkles className="size-4 text-accent" />
        Page assistant
      </h2>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => ask(preset.prompt)}
            disabled={assist.isPending}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              ask(question);
            }
          }}
          placeholder="Ask about this page, or ask it to write… (⌘↵)"
          rows={3}
          className="text-small"
        />
        <Button
          size="sm"
          onClick={() => ask(question)}
          loading={assist.isPending}
          disabled={!question.trim()}
        >
          <CornerDownLeft className="size-3.5" />
          Ask
        </Button>
      </div>

      {assist.isPending ? (
        <Skeleton className="h-24 w-full rounded-md" />
      ) : answer ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2">
          <p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-small text-foreground">
            {answer}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => onInsert(answer)}>
              Insert into page
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAnswer(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
