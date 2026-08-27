"use client";

import { useState } from "react";
import { Markdown } from "@/components/notes/markdown";
import { NoteEditor } from "@/components/notes/note-editor";
import type { MentionConfig } from "@/components/notes/editor-extensions";

export function MarkdownBody({
  value,
  onChange,
  orgId,
  mention,
  placeholder,
  emptyLabel = "Click to write…",
}: {
  value: string;
  onChange: (markdown: string) => void;
  orgId?: string;
  mention?: MentionConfig;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <NoteEditor
        value={value}
        onChange={onChange}
        mention={mention}
        placeholder={placeholder}
        autoFocus
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Edit this page"
      onClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        setEditing(true);
      }}
      className="min-h-[24rem] cursor-text rounded-md border border-transparent px-1 py-1 transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {value.trim().length > 0 ? (
        <Markdown source={value} orgId={orgId} />
      ) : (
        <span className="text-small text-muted-foreground">{emptyLabel}</span>
      )}
    </div>
  );
}
