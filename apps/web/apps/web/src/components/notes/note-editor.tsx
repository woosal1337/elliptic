"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "tiptap-markdown";
import { ListChecks, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  cn,
  toast,
} from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";
import {
  SlashCommand,
  createMention,
  selectionToTaskDrafts,
  type MentionConfig,
  type NoteTaskActions,
} from "@/components/notes/editor-extensions";
import { useNoteTaskActions } from "@/components/notes/note-task-actions";
import { ENTITY_DND_MIME, citationHtml, parseEntityRef } from "@/lib/dnd";

export const PROSE_CLASS = cn(
  "max-w-none focus:outline-none",
  "text-body leading-relaxed text-foreground",
  "[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-h3 [&_h1]:font-semibold [&_h1]:tracking-[-0.015em] [&_h1]:text-foreground",
  "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-h4 [&_h2]:font-semibold [&_h2]:text-foreground",
  "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-body [&_h3]:font-semibold [&_h3]:text-foreground",
  "[&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:text-small [&_h4]:font-semibold [&_h4]:text-foreground",
  "[&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic",
  "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:marker:text-muted-foreground",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ol]:marker:text-muted-foreground",
  "[&_ul[data-type=taskList]]:my-3 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:space-y-1 [&_ul[data-type=taskList]]:pl-0",
  "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2",
  "[&_ul[data-type=taskList]_li>label]:mt-1 [&_ul[data-type=taskList]_li>label]:select-none",
  "[&_ul[data-type=taskList]_li>div]:min-w-0 [&_ul[data-type=taskList]_li>div]:flex-1",
  "[&_li>p]:my-0",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
  "[&_code]:rounded-xs [&_code]:bg-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-subtle [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-caption [&_pre]:leading-relaxed",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[length:inherit]",
  "[&_hr]:my-6 [&_hr]:border-border",
  "[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground/70 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
);

function buildExtensions(
  placeholder: string,
  options: {
    slash?: boolean;
    mention?: MentionConfig;
    taskActions?: NoteTaskActions;
  } = {}
): AnyExtension[] {
  const extensions: AnyExtension[] = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      link: {
        openOnClick: false,
        HTMLAttributes: { rel: "noreferrer", target: "_blank" },
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Markdown.configure({
      html: false,
      tightLists: true,
      transformPastedText: true,
      transformCopiedText: true,
      linkify: true,
    }),
    Placeholder.configure({ placeholder }),
  ];
  if (options.slash) {
    extensions.push(SlashCommand.configure({ taskActions: options.taskActions }));
  }
  if (options.mention) {
    extensions.push(createMention(options.mention));
  }
  return extensions;
}

function readMarkdown(editor: Editor): string {
  const storage = (editor.storage as { markdown?: { getMarkdown(): string } }).markdown;
  return storage ? storage.getMarkdown() : "";
}

const AI_ACTIONS = [
  { action: "rephrase", label: "Rephrase" },
  { action: "fix_grammar", label: "Fix grammar" },
  { action: "summarize", label: "Summarize" },
  { action: "expand", label: "Expand" },
] as const;

const GENERATE_PRESETS = [
  { label: "TL;DR", prompt: "Write a concise TL;DR summary of the document as a short paragraph." },
  {
    label: "Action items",
    prompt: "Extract the action items from the document as a Markdown checklist.",
  },
  { label: "FAQ", prompt: "Generate a short FAQ (3-5 question/answer pairs) based on the document." },
] as const;

function AiGenerateControl({
  orgId,
  editorRef,
}: {
  orgId: string;
  editorRef: React.MutableRefObject<Editor | null>;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: (variables: { prompt: string; context: string }) =>
      api.post<{ result: string; ai_run_id: string }>(orgPath(orgId, "/ai/generate"), variables),
    onSuccess: ({ result: text }) => setResult(text),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const run = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setLastPrompt(trimmed);
    const context = editorRef.current ? readMarkdown(editorRef.current).slice(0, 12000) : "";
    generate.mutate({ prompt: trimmed, context });
  };

  const insert = () => {
    if (!result || !editorRef.current) return;
    editorRef.current.chain().focus().insertContent(`\n${result}\n`).run();
    setOpen(false);
    setResult(null);
    setPrompt("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setResult(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" onMouseDown={(event) => event.preventDefault()}>
          <Wand2 className="size-3.5" />
          Generate
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-80 flex-col gap-2 p-3"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-wrap gap-1.5">
          {GENERATE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant="ghost"
              disabled={generate.isPending}
              onClick={() => {
                setPrompt(preset.prompt);
                run(preset.prompt);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Textarea
          rows={2}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe what to generate from this page…"
        />
        {result ? (
          <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 text-caption text-foreground">
            {result}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          {result ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={generate.isPending}
              onClick={() => run(lastPrompt || prompt)}
            >
              <RefreshCw className="size-3.5" />
              Regenerate
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {result ? (
              <Button size="sm" onClick={insert}>
                Insert
              </Button>
            ) : (
              <Button size="sm" variant="outline" loading={generate.isPending} onClick={() => run(prompt)}>
                Generate
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function NoteEditor({
  value,
  onChange,
  placeholder = "Type “/” for blocks, “@” to mention. “## ” heading, “- ” list, “> ” quote…",
  className,
  slashCommands = true,
  mention,
  taskActions,
  orgId,
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  slashCommands?: boolean;
  mention?: MentionConfig;
  taskActions?: NoteTaskActions;
  orgId?: string;
}) {
  const routeTasks = useNoteTaskActions();
  const effectiveTaskActions = taskActions ?? routeTasks.taskActions;

  const extensions = useMemo(
    () =>
      buildExtensions(placeholder, {
        slash: slashCommands,
        mention,
        taskActions: effectiveTaskActions,
      }),
    [placeholder, slashCommands, mention, effectiveTaskActions]
  );

  const [selectionCount, setSelectionCount] = useState(0);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const transform = useMutation({
    mutationFn: (variables: { text: string; action: string }) =>
      api.post<{ result: string; ai_run_id: string }>(orgPath(orgId ?? "", "/ai/transform"), {
        text: variables.text,
        action: variables.action,
      }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const transformSelection = useCallback(
    (action: string) => {
      const instance = editorRef.current;
      if (!instance || !orgId) return;
      const { from, to } = instance.state.selection;
      if (from === to) return;
      const text = instance.state.doc.textBetween(from, to, "\n");
      if (!text.trim()) return;
      transform.mutate(
        { text, action },
        {
          onSuccess: ({ result }) => {
            instance.chain().focus().insertContentAt({ from, to }, result).run();
          },
        }
      );
    },
    [orgId, transform]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    editorProps: {
      attributes: { class: cn(PROSE_CLASS, "min-h-[24rem]", className) },
      handleDrop: (view, event) => {
        const raw = event.dataTransfer?.getData(ENTITY_DND_MIME);
        const ref = parseEntityRef(raw);
        if (!ref) return false;
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const pos = coords?.pos ?? view.state.selection.from;
        event.preventDefault();
        editorRef.current?.chain().focus().insertContentAt(pos, citationHtml(ref)).run();
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(readMarkdown(instance));
    },
    onSelectionUpdate: ({ editor: instance }) => {
      if (instance.state.selection.empty) {
        setSelectionCount(0);
        setHasTextSelection(false);
        return;
      }
      setSelectionCount(selectionToTaskDrafts(instance).length);
      setHasTextSelection(true);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (readMarkdown(editor) === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const convertSelection = useCallback(() => {
    if (!editor) return;
    const drafts = selectionToTaskDrafts(editor);
    if (drafts.length === 0) return;
    effectiveTaskActions.createTasks(drafts);
    setSelectionCount(0);
  }, [editor, effectiveTaskActions]);

  return (
    <div className="relative">
      {orgId || selectionCount > 0 ? (
        <div className="sticky top-2 z-20 mb-2 flex justify-end gap-2">
          {orgId ? <AiGenerateControl orgId={orgId} editorRef={editorRef} /> : null}
          {hasTextSelection && orgId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  loading={transform.isPending}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <Sparkles className="size-3.5" />
                  AI
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onCloseAutoFocus={(event) => event.preventDefault()}>
                {AI_ACTIONS.map((item) => (
                  <DropdownMenuItem
                    key={item.action}
                    onSelect={() => transformSelection(item.action)}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {selectionCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onMouseDown={(event) => event.preventDefault()}
              onClick={convertSelection}
            >
              <ListChecks className="size-3.5" />
              Create {selectionCount === 1 ? "task" : `${selectionCount} tasks`}
            </Button>
          ) : null}
        </div>
      ) : null}
      <EditorContent editor={editor} />
      {taskActions ? null : routeTasks.picker}
    </div>
  );
}

export function NoteRenderer({
  source,
  className,
  mention,
}: {
  source: string;
  className?: string;
  mention?: MentionConfig;
}) {
  const extensions = useMemo(
    () => buildExtensions("", { slash: false, mention }),
    [mention]
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions,
    content: source,
    editorProps: {
      attributes: { class: cn(PROSE_CLASS, className) },
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setContent(source, { emitUpdate: false });
  }, [editor, source]);

  if (source.trim().length === 0) {
    return <p className="text-small text-muted-foreground">Nothing here yet.</p>;
  }

  return <EditorContent editor={editor} />;
}
