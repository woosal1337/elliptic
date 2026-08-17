import { describe, expect, it } from "bun:test";
import {
  MENTION_GLYPH,
  mentionMarkdown,
  mentionTarget,
  parseMentionHref,
} from "./mentions";

describe("parseMentionHref", () => {
  it("reads the kind and id out of a stored mention link", () => {
    expect(parseMentionHref("/__mention/file/abc-123")).toEqual({ kind: "file", id: "abc-123" });
    expect(parseMentionHref("/__mention/note/n1")).toEqual({ kind: "note", id: "n1" });
    expect(parseMentionHref("/__mention/task/t1")).toEqual({ kind: "task", id: "t1" });
    expect(parseMentionHref("/__mention/user/u1")).toEqual({ kind: "user", id: "u1" });
  });

  it("decodes an escaped id", () => {
    expect(parseMentionHref("/__mention/file/a%2Fb")).toEqual({ kind: "file", id: "a/b" });
  });

  it("treats an unknown kind as a user mention rather than a link to nowhere", () => {
    expect(parseMentionHref("/__mention/spreadsheet/x")).toEqual({ kind: "user", id: "x" });
  });

  it("ignores anything that is not a mention link", () => {
    expect(parseMentionHref("https://example.com/docs")).toBeNull();
    expect(parseMentionHref("/app/org/drive")).toBeNull();
    expect(parseMentionHref("/__mention/file")).toBeNull();
    expect(parseMentionHref("/__mention/file/")).toBeNull();
  });
});

describe("mentionTarget", () => {
  const org = "11111111-1111-1111-1111-111111111111";

  it("sends a Drive document to the Drive with the document selected", () => {
    expect(mentionTarget("file", "abc-123", "Acme MSA", org)).toBe(
      `/app/${org}/drive?file=abc-123`
    );
  });

  it("sends a page to the page and a task to its identifier", () => {
    expect(mentionTarget("note", "n1", "Runbook", org)).toBe(`/app/${org}/notes/n1`);
    expect(mentionTarget("task", "t1", "COS-42", org)).toBe(`/app/${org}/browse/COS-42`);
  });

  it("gives a user mention no destination", () => {
    expect(mentionTarget("user", "u1", "Ege", org)).toBeNull();
  });

  it("gives nothing a destination without an org in hand", () => {
    expect(mentionTarget("file", "abc-123", "Acme MSA", undefined)).toBeNull();
  });

  it("escapes an id that would otherwise break the query", () => {
    expect(mentionTarget("file", "a b&c", "x", org)).toBe(`/app/${org}/drive?file=a%20b%26c`);
  });
});

describe("mentionMarkdown", () => {
  it("round-trips through parseMentionHref", () => {
    const markdown = mentionMarkdown("file", "abc-123", "Acme MSA");
    expect(markdown).toBe("[Acme MSA](/__mention/file/abc-123)");
    const href = markdown.slice(markdown.indexOf("](") + 2, -1);
    expect(parseMentionHref(href)).toEqual({ kind: "file", id: "abc-123" });
  });

  it("escapes brackets in the label so the link cannot be split", () => {
    expect(mentionMarkdown("file", "f1", "Plan [final]")).toBe(
      "[Plan \\[final\\]](/__mention/file/f1)"
    );
  });
});

describe("MENTION_GLYPH", () => {
  it("gives every kind its own marker", () => {
    const glyphs = Object.values(MENTION_GLYPH);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    expect(MENTION_GLYPH.file).toBe("▤");
  });
});
