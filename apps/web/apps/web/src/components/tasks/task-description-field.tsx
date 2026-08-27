"use client";

import { useState } from "react";
import { Markdown } from "@/components/notes/markdown";
import type { MentionConfig } from "@/components/notes/editor-extensions";
import { TaskDescriptionEditor } from "./task-description-editor";

export function TaskDescriptionField({
  value,
  onChange,
  orgId,
  mention,
  emptyLabel = "Add a description…",
}: {
  value: string;
  onChange: (markdown: string) => void;
  orgId: string;
  mention: MentionConfig;
  emptyLabel?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TaskDescriptionEditor value={value} onChange={onChange} mention={mention} autoFocus />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Edit the description"
      onClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        setEditing(true);
      }}
      className="min-h-[8rem] cursor-text rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {value.trim().length > 0 ? (
        <Markdown source={value} orgId={orgId} />
      ) : (
        <span className="text-small text-muted-foreground">{emptyLabel}</span>
      )}
    </div>
  );
}
