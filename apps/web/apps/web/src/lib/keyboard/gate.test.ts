import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Window } from "happy-dom";
import { shortcutAllowed } from "./gate";
import { isEditableTarget } from "./keyboard-provider";
import type { ShortcutBinding } from "./types";

function binding(extra: Partial<ShortcutBinding> = {}): ShortcutBinding {
  return { id: "b", keys: "mod+a", label: "A", scope: "action", run: () => {}, ...extra };
}

describe("shortcutAllowed", () => {
  it("runs any binding while nothing blocks it", () => {
    expect(shortcutAllowed(binding(), false)).toBe(true);
    expect(shortcutAllowed(binding({ scope: "global" }), false)).toBe(true);
    expect(shortcutAllowed(binding({ scope: "navigation" }), false)).toBe(true);
  });

  it("holds an action and a chord back while a field has the caret", () => {
    expect(shortcutAllowed(binding(), true)).toBe(false);
    expect(shortcutAllowed(binding({ scope: "navigation" }), true)).toBe(false);
  });

  it("lets the palette toggle through, because it belongs to the app", () => {
    expect(shortcutAllowed(binding({ keys: "mod+k", scope: "global" }), true)).toBe(true);
  });

  it("never runs a disabled binding", () => {
    expect(shortcutAllowed(binding({ enabled: false }), false)).toBe(false);
    expect(shortcutAllowed(binding({ scope: "global", enabled: false }), true)).toBe(false);
  });
});

describe("isEditableTarget", () => {
  let window: Window;
  const installed: string[] = [];

  beforeAll(() => {
    window = new Window({ url: "https://localhost/" });
    const w = window as unknown as Record<string, unknown>;
    const g = globalThis as unknown as Record<string, unknown>;
    for (const key of ["window", "document", "Node", "Element", "HTMLElement"]) {
      if (g[key] === undefined) {
        g[key] = key === "window" ? window : w[key];
        installed.push(key);
      }
    }
  });

  afterAll(async () => {
    await window.happyDOM?.close?.();
    const g = globalThis as unknown as Record<string, unknown>;
    for (const key of installed) delete g[key];
  });

  function make(html: string): Element {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host.firstElementChild as Element;
  }

  it("counts the fields a person types into", () => {
    expect(isEditableTarget(make("<input />"))).toBe(true);
    expect(isEditableTarget(make("<textarea></textarea>"))).toBe(true);
    expect(isEditableTarget(make("<select></select>"))).toBe(true);
  });

  it("counts a rich text editor and anything inside it", () => {
    const editor = make('<div contenteditable="true"><p><span>word</span></p></div>');
    expect(isEditableTarget(editor)).toBe(true);
    expect(isEditableTarget(editor.querySelector("span"))).toBe(true);
  });

  it("leaves the board alone", () => {
    expect(isEditableTarget(make('<div class="board"></div>'))).toBe(false);
    expect(isEditableTarget(make("<button>Open</button>"))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
