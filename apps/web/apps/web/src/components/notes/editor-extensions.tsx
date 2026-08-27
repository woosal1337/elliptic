"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CheckSquare,
  Code2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Paperclip,
  Quote,
  Text,
  type LucideIcon,
} from "lucide-react";
import {
  Node,
  Extension,
  mergeAttributes,
  type Editor,
  type Range,
} from "@tiptap/core";
import { ReactRenderer, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { cn } from "@elliptic/ui";
import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Markdown as MarkdownExtension } from "tiptap-markdown";

export type TaskDraft = { title: string };

export type NoteTaskActions = {
  createTasks: (drafts: TaskDraft[]) => void;
};

type SlashItem = {
  title: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  run: (editor: Editor, range: Range) => void;
};

function blockText(editor: Editor, range: Range): string {
  const { doc } = editor.state;
  const resolved = doc.resolve(range.from);
  return resolved.parent.textContent.trim();
}

const BASE_SLASH_ITEMS: SlashItem[] = [
  {
    title: "Text",
    description: "Plain paragraph",
    keywords: ["text", "paragraph", "body"],
    icon: Text,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Section title",
    keywords: ["h1", "heading", "title", "large"],
    icon: Heading1,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Subsection title",
    keywords: ["h2", "heading", "subtitle"],
    icon: Heading2,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Minor heading",
    keywords: ["h3", "heading", "small"],
    icon: Heading3,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bullet list",
    description: "Unordered list",
    keywords: ["bullet", "list", "unordered", "ul"],
    icon: List,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "Ordered list",
    keywords: ["number", "ordered", "list", "ol"],
    icon: ListOrdered,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    description: "Checklist of items",
    keywords: ["task", "todo", "checklist", "check"],
    icon: ListChecks,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    description: "Capture a callout",
    keywords: ["quote", "blockquote", "callout"],
    icon: Quote,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    description: "Monospaced code",
    keywords: ["code", "snippet", "pre"],
    icon: Code2,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    keywords: ["divider", "separator", "rule", "hr"],
    icon: Minus,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

function buildSlashItems(taskActions?: NoteTaskActions): SlashItem[] {
  if (!taskActions) return BASE_SLASH_ITEMS;
  const taskItem: SlashItem = {
    title: "Create task",
    description: "Turn this line into a task",
    keywords: ["task", "issue", "todo", "create", "track"],
    icon: CheckSquare,
    run: (editor, range) => {
      const title = blockText(editor, range);
      editor.chain().focus().deleteRange(range).run();
      if (title.length > 0) {
        taskActions.createTasks([{ title }]);
      }
    },
  };
  return [taskItem, ...BASE_SLASH_ITEMS];
}

function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return items;
  return items.filter((item) =>
    [item.title, ...item.keywords].some((token) =>
      token.toLowerCase().includes(normalized)
    )
  );
}

type ListHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

const SlashList = forwardRef<
  ListHandle,
  { items: SlashItem[]; command: (item: SlashItem) => void }
>(function SlashList({ items, command }, ref) {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setActive(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") {
        setActive((value) => (value + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setActive((value) => (value - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[active];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  useLayoutEffect(() => {
    const node = containerRef.current?.querySelector<HTMLElement>(
      `[data-index="${active}"]`
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (items.length === 0) {
    return (
      <div className="w-72 rounded-lg border border-border bg-surface p-3 shadow-xl">
        <p className="text-caption text-muted-foreground">No matching blocks</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-72 w-72 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-xl"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            data-index={index}
            onMouseEnter={() => setActive(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              command(item);
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
              index === active ? "bg-subtle" : "hover:bg-subtle/60"
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
              <Icon className="size-3.5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-small font-medium text-foreground">{item.title}</span>
              <span className="truncate text-caption text-muted-foreground">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
});

export type MentionItem = {
  id: string;
  label: string;
  hint?: string;
  kind: "user" | "task" | "note" | "file";
};

const MentionList = forwardRef<
  ListHandle,
  { items: MentionItem[]; command: (item: MentionItem) => void }
>(function MentionList({ items, command }, ref) {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setActive(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") {
        setActive((value) => (value + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setActive((value) => (value - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[active];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  useLayoutEffect(() => {
    const node = containerRef.current?.querySelector<HTMLElement>(
      `[data-index="${active}"]`
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (items.length === 0) {
    return (
      <div className="w-64 rounded-lg border border-border bg-surface p-3 shadow-xl">
        <p className="text-caption text-muted-foreground">No matches</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-72 w-64 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-xl"
    >
      {items.map((item, index) => (
        <button
          key={`${item.kind}-${item.id}`}
          type="button"
          data-index={index}
          onMouseEnter={() => setActive(index)}
          onMouseDown={(event) => {
            event.preventDefault();
            command(item);
          }}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
            index === active ? "bg-subtle" : "hover:bg-subtle/60"
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {item.kind === "note" ? (
              <FileText
                className="size-3.5 shrink-0 text-accent"
                aria-hidden="true"
              />
            ) : null}
            {item.kind === "file" ? (
              <Paperclip className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
            ) : null}
            <span className="truncate text-small text-foreground">{item.label}</span>
          </span>
          {item.kind === "note" ? (
            <span className="shrink-0 rounded-sm bg-accent-subtle/40 px-1 text-caption text-accent">
              Note
            </span>
          ) : item.kind === "file" ? (
            <span className="shrink-0 rounded-sm bg-accent-subtle/40 px-1 text-caption text-accent">
              Drive
            </span>
          ) : item.hint ? (
            <span className="shrink-0 font-mono text-caption text-muted-foreground">
              {item.hint}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
});

type SuggestionState<I> = {
  active: boolean;
  range: Range | null;
  query: string;
  items: I[];
  decorationId: string | null;
};

type SuggestionConfig<I> = {
  char: string;
  pluginKey: PluginKey<SuggestionState<I>>;
  getItems: (query: string) => I[];
  render: (
    items: I[],
    onSelect: (item: I) => void,
    ref: (handle: ListHandle | null) => void
  ) => ReactNode;
  onSelect: (editor: Editor, range: Range, item: I) => void;
  allowSpaces?: boolean;
};

function createSuggestionPlugin<I>(editor: Editor, config: SuggestionConfig<I>) {
  let renderer: ReactRenderer | null = null;
  let popup: HTMLDivElement | null = null;
  let listHandle: ListHandle | null = null;
  let currentItems: I[] = [];
  let currentRange: Range | null = null;
  let reposition: (() => void) | null = null;

  const escapedChar = config.char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const triggerRegex = new RegExp(
    `(?:^|\\s)${escapedChar}([^\\s${config.allowSpaces ? "" : ""}]*)$`
  );

  function select(item: I) {
    const state = config.pluginKey.getState(editor.state);
    if (!state?.range) return;
    config.onSelect(editor, state.range, item);
  }

  function placePopup() {
    if (!popup || !currentRange) return;
    const start = editor.view.coordsAtPos(currentRange.from);
    const rect = popup.getBoundingClientRect();
    const margin = 8;
    let left = start.left;
    let top = start.bottom + 6;
    if (left + rect.width + margin > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (top + rect.height + margin > window.innerHeight) {
      const above = start.top - rect.height - 6;
      if (above > margin) top = above;
    }
    popup.style.left = `${Math.round(left + window.scrollX)}px`;
    popup.style.top = `${Math.round(top + window.scrollY)}px`;
  }

  function destroyPopup() {
    if (reposition) {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      reposition = null;
    }
    renderer?.destroy();
    renderer = null;
    popup?.remove();
    popup = null;
    listHandle = null;
    currentRange = null;
  }

  function ensurePopup() {
    if (popup) return;
    popup = document.createElement("div");
    popup.style.position = "absolute";
    popup.style.top = "0";
    popup.style.left = "0";
    popup.style.zIndex = "60";
    document.body.appendChild(popup);
    renderer = new ReactRenderer(
      function Wrapper({ items }: { items: I[] }) {
        return config.render(items, select, (handle) => {
          listHandle = handle;
        });
      },
      { editor, props: { items: currentItems } }
    );
    popup.appendChild(renderer.element as HTMLElement);
    reposition = () => placePopup();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
  }

  return new Plugin<SuggestionState<I>>({
    key: config.pluginKey,
    view() {
      return {
        update: (view) => {
          const state = config.pluginKey.getState(view.state);
          if (!state?.active || !state.range) {
            destroyPopup();
            return;
          }
          currentItems = state.items;
          currentRange = state.range;
          ensurePopup();
          renderer?.updateProps({ items: state.items });
          requestAnimationFrame(() => placePopup());
        },
        destroy: () => destroyPopup(),
      };
    },
    state: {
      init(): SuggestionState<I> {
        return { active: false, range: null, query: "", items: [], decorationId: null };
      },
      apply(tr, prev): SuggestionState<I> {
        const { selection } = tr;
        if (!selection.empty) {
          return { active: false, range: null, query: "", items: [], decorationId: null };
        }
        const { $from } = selection;
        const textBefore = $from.parent.textBetween(
          0,
          $from.parentOffset,
          undefined,
          "￼"
        );
        const match = triggerRegex.exec(textBefore);
        if (!match) {
          return { active: false, range: null, query: "", items: [], decorationId: null };
        }
        const query = match[1] ?? "";
        const from = $from.pos - query.length - config.char.length;
        const to = $from.pos;
        const items = config.getItems(query);
        return {
          active: true,
          range: { from, to },
          query,
          items,
          decorationId: prev.decorationId,
        };
      },
    },
    props: {
      handleKeyDown(_view, event) {
        const state = config.pluginKey.getState(editor.state);
        if (!state?.active) return false;
        if (event.key === "Escape") {
          destroyPopup();
          return true;
        }
        return listHandle?.onKeyDown(event) ?? false;
      },
      decorations(editorState) {
        const state = config.pluginKey.getState(editorState);
        if (!state?.active || !state.range) return DecorationSet.empty;
        return DecorationSet.create(editorState.doc, [
          Decoration.inline(state.range.from, state.range.to, {
            class: "rounded-xs bg-accent-subtle/40 text-foreground",
          }),
        ]);
      },
    },
  });
}

export interface SlashCommandOptions {
  taskActions?: NoteTaskActions;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",
  addOptions() {
    return { taskActions: undefined };
  },
  addProseMirrorPlugins() {
    const items = buildSlashItems(this.options.taskActions);
    return [
      createSuggestionPlugin<SlashItem>(this.editor, {
        char: "/",
        pluginKey: new PluginKey<SuggestionState<SlashItem>>("slashCommand"),
        getItems: (query) => filterSlashItems(items, query),
        render: (items, onSelect, ref) => (
          <SlashList ref={ref} items={items} command={onSelect} />
        ),
        onSelect: (editor, range, item) => item.run(editor, range),
      }),
    ];
  },
});

export function selectionToTaskDrafts(editor: Editor): TaskDraft[] {
  const { from, to, empty } = editor.state.selection;
  const drafts: TaskDraft[] = [];
  const seen = new Set<number>();
  editor.state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    if (seen.has(pos)) return false;
    seen.add(pos);
    const text = node.textContent.trim();
    if (text.length > 0) drafts.push({ title: text });
    return false;
  });
  if (drafts.length === 0 && !empty) {
    const text = editor.state.doc.textBetween(from, to, "\n").trim();
    if (text.length > 0) {
      for (const line of text.split("\n")) {
        const trimmed = line.replace(/^[-*+]\s+|^\d+[.)]\s+|^\[[ xX]\]\s+/, "").trim();
        if (trimmed.length > 0) drafts.push({ title: trimmed });
      }
    }
  }
  return drafts;
}

export type MentionResolver = (query: string) => MentionItem[];

export type MentionConfig = {
  resolve: MentionResolver;
  onMention?: (item: MentionItem) => void;
  onActivate?: (item: MentionItem) => void;
};

function mentionKind(value: string | undefined): MentionItem["kind"] {
  if (value === "task") return "task";
  if (value === "note") return "note";
  if (value === "file") return "file";
  return "user";
}

function mentionText(kind: string | undefined, label: string | undefined): string {
  const text = label ?? "";
  if (kind === "task") return `#${text}`;
  if (kind === "note") return `※${text}`;
  if (kind === "file") return `▤${text}`;
  return `@${text}`;
}

const MENTION_HREF_PREFIX = "/__mention/";

function mentionHref(kind: string | undefined, id: string | undefined): string {
  const safeKind = mentionKind(kind);
  return `${MENTION_HREF_PREFIX}${safeKind}/${encodeURIComponent(id ?? "")}`;
}

function mentionMarkdown(
  kind: string | undefined,
  id: string | undefined,
  label: string | undefined
): string {
  const text = (label ?? "").replace(/([[\]])/g, "\\$1");
  return `[${text}](${mentionHref(kind, id)})`;
}

function parseMentionHref(
  href: string | null | undefined
): { kind: MentionItem["kind"]; id: string } | null {
  if (!href || !href.startsWith(MENTION_HREF_PREFIX)) return null;
  const rest = href.slice(MENTION_HREF_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash < 0) return null;
  const kind = mentionKind(rest.slice(0, slash));
  let id = rest.slice(slash + 1);
  try {
    id = decodeURIComponent(id);
  } catch {
  }
  if (id.length === 0) return null;
  return { kind, id };
}

function MentionChip({
  node,
  onActivate,
}: {
  node: { attrs: Record<string, string> };
  onActivate?: (item: MentionItem) => void;
}) {
  const kind = mentionKind(node.attrs.kind);
  const interactive =
    (kind === "task" || kind === "note" || kind === "file") &&
    typeof onActivate === "function";
  const activate = () =>
    onActivate?.({
      id: node.attrs.id ?? "",
      label: node.attrs.label ?? "",
      kind,
    });
  return (
    <NodeViewWrapper
      as="span"
      data-mention=""
      contentEditable={false}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onMouseDown={interactive ? (event: { preventDefault: () => void }) => event.preventDefault() : undefined}
      onClick={interactive ? activate : undefined}
      onKeyDown={
        interactive
          ? (event: { key: string; preventDefault: () => void }) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }
          : undefined
      }
      className={cn(
        "mx-0.5 inline-flex items-center gap-0.5 rounded-sm px-1 align-baseline font-medium",
        kind === "task" && "bg-subtle font-mono text-caption text-foreground",
        kind === "note" && "bg-accent-subtle/40 text-small text-accent",
        kind === "file" && "bg-accent-subtle/40 text-small text-accent",
        kind === "user" && "bg-accent-subtle/50 text-small text-accent",
        interactive &&
          "cursor-pointer transition-colors hover:bg-accent-subtle hover:text-accent"
      )}
    >
      {kind === "note" ? (
        <FileText className="size-3 shrink-0" aria-hidden="true" />
      ) : kind === "file" ? (
        <Paperclip className="size-3 shrink-0" aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{kind === "task" ? "#" : "@"}</span>
      )}
      {node.attrs.label}
    </NodeViewWrapper>
  );
}

export function createMention(config: MentionConfig) {
  return Node.create({
    name: "mention",
    group: "inline",
    inline: true,
    atom: true,
    selectable: false,
    addAttributes() {
      return {
        id: { default: "" },
        label: { default: "" },
        kind: { default: "user" },
      };
    },
    parseHTML() {
      return [
        { tag: "span[data-mention]" },
        {
          tag: `a[href^="${MENTION_HREF_PREFIX}"]`,
          priority: 60,
          getAttrs: (el: HTMLElement) => {
            const parsed = parseMentionHref(el.getAttribute("href"));
            if (!parsed) return false;
            return {
              id: parsed.id,
              kind: parsed.kind,
              label: el.textContent ?? "",
            };
          },
        },
      ];
    },
    renderHTML({ node, HTMLAttributes }) {
      return [
        "span",
        mergeAttributes(HTMLAttributes, {
          "data-mention": "",
          "data-id": node.attrs.id,
          "data-kind": node.attrs.kind,
        }),
        mentionText(node.attrs.kind, node.attrs.label),
      ];
    },
    renderText({ node }) {
      return mentionMarkdown(node.attrs.kind, node.attrs.id, node.attrs.label);
    },
    addNodeView() {
      const onActivate = config.onActivate;
      return ReactNodeViewRenderer((props: { node: { attrs: Record<string, string> } }) => (
        <MentionChip node={props.node} onActivate={onActivate} />
      ));
    },
    addStorage() {
      return {
        markdown: {
          serialize(
            stateWriter: { write: (value: string) => void },
            node: { attrs: Record<string, string> }
          ) {
            stateWriter.write(
              mentionMarkdown(node.attrs.kind, node.attrs.id, node.attrs.label)
            );
          },
          parse: {},
        },
      };
    },
    addProseMirrorPlugins() {
      const editor = this.editor;
      const type = this.type;
      return [
        createSuggestionPlugin<MentionItem>(editor, {
          char: "@",
          pluginKey: new PluginKey<SuggestionState<MentionItem>>("mention"),
          getItems: (query) => config.resolve(query),
          render: (items, onSelect, ref) => (
            <MentionList ref={ref} items={items} command={onSelect} />
          ),
          onSelect: (instance, range, item) => {
            instance
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: type.name,
                  attrs: { id: item.id, label: item.label, kind: item.kind },
                },
                { type: "text", text: " " },
              ])
              .run();
            config.onMention?.(item);
          },
        }),
      ];
    },
  });
}

export interface EditorExtensionOptions {
  placeholder: string;
  slash?: boolean;
  mention?: MentionConfig;
  taskActions?: NoteTaskActions;
  taskList?: boolean;
}

export function buildEditorExtensions(options: EditorExtensionOptions): AnyExtension[] {
  const extensions: AnyExtension[] = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      link: {
        openOnClick: false,
        HTMLAttributes: { rel: "noreferrer", target: "_blank" },
      },
    }),
    TableKit.configure({ table: { resizable: false } }),
  ];

  if (options.taskList !== false) {
    extensions.push(TaskList, TaskItem.configure({ nested: true }));
  }

  extensions.push(
    MarkdownExtension.configure({
      html: false,
      tightLists: true,
      transformPastedText: true,
      transformCopiedText: true,
      linkify: true,
    }),
    Placeholder.configure({ placeholder: options.placeholder })
  );

  if (options.slash) {
    extensions.push(SlashCommand.configure({ taskActions: options.taskActions }));
  }
  if (options.mention) {
    extensions.push(createMention(options.mention));
  }

  return extensions;
}
