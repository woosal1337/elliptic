"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { cn } from "@elliptic/ui";
import { buildEditorExtensions, type MentionConfig } from "@/components/notes/editor-extensions";
import { PROSE_CLASS } from "@/components/notes/note-editor";

function readMarkdown(editor: Editor): string {
  const storage = (editor.storage as { markdown?: { getMarkdown(): string } }).markdown;
  return storage ? storage.getMarkdown() : "";
}

export function TaskDescriptionEditor({
  value,
  onChange,
  mention,
  placeholder = "Add a description… “/” for blocks, “@” to link a task, page or document",
  className,
  autoFocus = false,
}: {
  value: string;
  onChange: (markdown: string) => void;
  mention: MentionConfig;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const extensions = useMemo(
    () => buildEditorExtensions({ placeholder, slash: true, mention, taskList: false }),
    [placeholder, mention]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          PROSE_CLASS,
          "min-h-[8rem] rounded-md border border-border bg-transparent px-3 py-2 transition-colors focus-within:border-input",
          className
        ),
      },
    },
    onUpdate: ({ editor: instance }) => onChange(readMarkdown(instance)),
  });

  useEffect(() => {
    if (!autoFocus || !editor || editor.isDestroyed) return;
    editor.commands.focus("end");
  }, [autoFocus, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (readMarkdown(editor) === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return <EditorContent editor={editor} />;
}
