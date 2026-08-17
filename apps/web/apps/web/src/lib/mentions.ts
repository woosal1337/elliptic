/**
 * Mention links — the one place that knows what `/__mention/…` points at.
 *
 * A mention is stored inside markdown as `[label](/__mention/<kind>/<id>)`. The
 * prefix is a relative path, not a URL, so it survives moving between the hosted
 * instance and a self-hosted one, and the editor and the renderer both catch it
 * before a browser would try to follow it.
 */

export const MENTION_HREF_PREFIX = "/__mention/";

export type MentionKind = "task" | "note" | "file" | "user";

/** The glyph that stands in for the chip wherever only text can be shown. */
export const MENTION_GLYPH: Record<MentionKind, string> = {
  task: "#",
  note: "※",
  file: "▤",
  user: "@",
};

const KINDS: readonly MentionKind[] = ["task", "note", "file", "user"];

function asKind(value: string): MentionKind {
  // An unknown kind reads as a user mention: it renders as plain @text and links
  // nowhere, which is the harmless reading of a value this build does not know.
  return (KINDS as readonly string[]).includes(value) ? (value as MentionKind) : "user";
}

export function parseMentionHref(href: string): { kind: MentionKind; id: string } | null {
  if (!href.startsWith(MENTION_HREF_PREFIX)) return null;
  const rest = href.slice(MENTION_HREF_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash < 0) return null;
  const kind = asKind(rest.slice(0, slash));
  let id = rest.slice(slash + 1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape keeps the raw id; the route below will simply not resolve.
  }
  if (!id) return null;
  return { kind, id };
}

/**
 * Where clicking a mention should go, or null when it has no page of its own.
 *
 * A task is addressed by its human identifier (COS-42), which is the label, while
 * a page and a Drive document are addressed by id. A Drive document opens the
 * Drive with the document selected, so the reader lands on it even when they have
 * never opened the folder it sits in.
 */
export function mentionTarget(
  kind: MentionKind,
  id: string,
  label: string,
  orgId: string | undefined
): string | null {
  if (!orgId) return null;
  if (kind === "note") return `/app/${orgId}/notes/${id}`;
  if (kind === "file") return `/app/${orgId}/drive?file=${encodeURIComponent(id)}`;
  if (kind === "task") return `/app/${orgId}/browse/${encodeURIComponent(label)}`;
  return null;
}

/** The markdown that links a mention, with the label's brackets escaped. */
export function mentionMarkdown(kind: MentionKind, id: string, label: string): string {
  return `[${label.replace(/([[\]])/g, "\\$1")}](${MENTION_HREF_PREFIX}${kind}/${id})`;
}
