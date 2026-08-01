"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { cn } from "@elliptic/ui";
import { SlashCommand, createMention, type MentionConfig } from "@/components/notes/editor-extensions";
import { PROSE_CLASS } from "@/components/notes/note-editor";

function readMarkdown(editor: Editor): string {
  const storage = (editor.storage as { markdown?: { getMarkdown(): string } }).markdown;
  return storage ? storage.getMarkdown() : "";
}

function buildExtensions(placeholder: string, mention: MentionConfig): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      link: {
        openOnClick: false,
        HTMLAttributes: { rel: "noreferrer", target: "_blank" },
      },
    }),
    Markdown.configure({
      html: false,
      tightLists: true,
      transformPastedText: true,
      transformCopiedText: true,
      linkify: true,
    }),
    Placeholder.configure({ placeholder }),
    SlashCommand.configure({}),
    createMention(mention),
  ];
}

export function TaskDescriptionEditor({
  value,
  onChange,
  mention,
  placeholder = "Add a description… “/” for blocks, “@” to link another task",
  className,
}: {
  value: string;
  onChange: (markdown: string) => void;
  mention: MentionConfig;
  placeholder?: string;
  className?: string;
}) {
  const extensions = useMemo(() => buildExtensions(placeholder, mention), [placeholder, mention]);

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
    if (!editor || editor.isDestroyed) return;
    if (readMarkdown(editor) === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return <EditorContent editor={editor} />;
}
