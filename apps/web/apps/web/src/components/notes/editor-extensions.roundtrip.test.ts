import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Window } from "happy-dom";

let window: Window;
const installedGlobals: string[] = [];

beforeAll(() => {
  window = new Window({ url: "https://localhost/" });
  const w = window as unknown as Record<string, unknown>;
  const g = globalThis as unknown as Record<string, unknown>;
  for (const key of [
    "window",
    "document",
    "navigator",
    "DOMParser",
    "Node",
    "Element",
    "HTMLElement",
    "HTMLAnchorElement",
    "HTMLSpanElement",
    "Text",
    "DocumentFragment",
    "Event",
    "CustomEvent",
    "MutationObserver",
    "getComputedStyle",
  ]) {
    if (g[key] === undefined) {
      g[key] = key === "window" ? window : w[key];
      installedGlobals.push(key);
    }
  }
});

afterAll(async () => {
  await window.happyDOM?.close?.();
  const g = globalThis as unknown as Record<string, unknown>;
  for (const key of installedGlobals) delete g[key];
});

async function buildEditor() {
  const { Editor } = await import("@tiptap/core");
  const { default: StarterKit } = await import("@tiptap/starter-kit");
  const { Markdown } = await import("tiptap-markdown");
  const { createMention } = await import("./editor-extensions");

  return new Editor({
    extensions: [
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
      createMention({ resolve: () => [], onActivate: () => {} }),
    ],
  });
}

function getMarkdown(editor: { storage: unknown }): string {
  return (editor.storage as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
}

type JsonNode = { type?: string; attrs?: Record<string, unknown>; content?: JsonNode[] };

function findMention(node: JsonNode): JsonNode | null {
  if (node.type === "mention") return node;
  for (const child of node.content ?? []) {
    const hit = findMention(child);
    if (hit) return hit;
  }
  return null;
}

async function roundTrip(kind: "note" | "task" | "user" | "file", id: string, label: string) {
  const a = await buildEditor();
  a.commands.setContent({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "mention", attrs: { id, label, kind } }],
      },
    ],
  });

  const markdown = getMarkdown(a);
  a.destroy();

  const b = await buildEditor();
  b.commands.setContent(markdown);
  const json = b.getJSON() as JsonNode;
  const mention = findMention(json);
  b.destroy();

  return { markdown, mention };
}

describe("mention markdown round-trip", () => {
  it("serializes a note mention as a relative /__mention link carrying kind + id", async () => {
    const { markdown } = await roundTrip("note", "abc123", "Runbook — Deploy");
    expect(markdown).toContain("/__mention/note/abc123");
  });

  it("re-hydrates a note mention chip from stored markdown (not a link, not text)", async () => {
    const { mention } = await roundTrip("note", "abc123", "Runbook — Deploy");
    expect(mention).not.toBeNull();
    expect(mention?.type).toBe("mention");
    expect(mention?.attrs?.id).toBe("abc123");
    expect(mention?.attrs?.kind).toBe("note");
    expect(mention?.attrs?.label).toBe("Runbook — Deploy");
  });

  it("re-hydrates a task mention chip from stored markdown", async () => {
    const { markdown, mention } = await roundTrip("task", "task-789", "Ship the fix");
    expect(markdown).toContain("/__mention/task/task-789");
    expect(mention?.type).toBe("mention");
    expect(mention?.attrs?.id).toBe("task-789");
    expect(mention?.attrs?.kind).toBe("task");
    expect(mention?.attrs?.label).toBe("Ship the fix");
  });

  it("re-hydrates a user mention chip from stored markdown", async () => {
    const { markdown, mention } = await roundTrip("user", "user-42", "Ege");
    expect(markdown).toContain("/__mention/user/user-42");
    expect(mention?.type).toBe("mention");
    expect(mention?.attrs?.id).toBe("user-42");
    expect(mention?.attrs?.kind).toBe("user");
  });

  it("re-hydrates a Drive document mention chip from stored markdown", async () => {
    const { markdown, mention } = await roundTrip("file", "file-7", "Acme MSA.pdf");
    expect(markdown).toContain("/__mention/file/file-7");
    expect(mention?.type).toBe("mention");
    expect(mention?.attrs?.id).toBe("file-7");
    expect(mention?.attrs?.kind).toBe("file");
    expect(mention?.attrs?.label).toBe("Acme MSA.pdf");
  });

  it("keeps a document mention distinct from a note mention", async () => {
    const file = await roundTrip("file", "same-id", "Same name");
    const note = await roundTrip("note", "same-id", "Same name");
    expect(file.mention?.attrs?.kind).toBe("file");
    expect(note.mention?.attrs?.kind).toBe("note");
    expect(file.markdown).not.toBe(note.markdown);
  });

  it("leaves an ordinary markdown link as a Link mark, not a mention", async () => {
    const editor = await buildEditor();
    editor.commands.setContent("[Docs](https://example.com/docs)");
    const json = editor.getJSON() as JsonNode;
    const mention = findMention(json);
    expect(mention).toBeNull();
    const markdown = getMarkdown(editor);
    editor.destroy();
    expect(markdown).toContain("[Docs](https://example.com/docs)");
  });
});

async function buildTaskListEditor() {
  const { Editor } = await import("@tiptap/core");
  const { default: StarterKit } = await import("@tiptap/starter-kit");
  const { TaskItem, TaskList } = await import("@tiptap/extension-list");
  const { Markdown } = await import("tiptap-markdown");

  return new Editor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ html: false, tightLists: true }),
    ],
  });
}

function hasNodeType(node: JsonNode, type: string): boolean {
  if (node.type === type) return true;
  return (node.content ?? []).some((child) => hasNodeType(child, type));
}

describe("task list markdown round-trip", () => {
  it("serializes a task list to markdown checkboxes and re-hydrates it", async () => {
    const a = await buildTaskListEditor();
    a.commands.setContent({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [{ type: "paragraph", content: [{ type: "text", text: "done" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "todo" }] }],
            },
          ],
        },
      ],
    });
    const markdown = getMarkdown(a);
    a.destroy();
    expect(markdown).toContain("[x] done");
    expect(markdown).toContain("[ ] todo");

    const b = await buildTaskListEditor();
    b.commands.setContent(markdown);
    const json = b.getJSON() as JsonNode;
    b.destroy();
    expect(hasNodeType(json, "taskList")).toBe(true);
    expect(hasNodeType(json, "taskItem")).toBe(true);
  });
});
