import { Linking } from "react-native"

import { openDocumentFromLink } from "@/context/DocumentViewer"
import { navigate } from "@/navigators/navigationUtilities"

/**
 * Mentions inside a description, and where tapping one goes.
 *
 * The web editor stores a mention as `[label](/__mention/<kind>/<id>)`. That href
 * is a relative path, so handing it to `Linking.openURL` does nothing at all —
 * which is exactly what tapping a linked page or document used to do here. Parse
 * it instead and push the screen it names.
 */

const PREFIX = "/__mention/"

export type MentionKind = "task" | "note" | "file" | "user"

const KINDS: readonly string[] = ["task", "note", "file", "user"]

export function parseMentionHref(href: string): { kind: MentionKind; id: string } | null {
  if (!href.startsWith(PREFIX)) return null
  const rest = href.slice(PREFIX.length)
  const slash = rest.indexOf("/")
  if (slash < 0) return null
  const rawKind = rest.slice(0, slash)
  const kind = (KINDS.includes(rawKind) ? rawKind : "user") as MentionKind
  let id = rest.slice(slash + 1)
  try {
    id = decodeURIComponent(id)
  } catch {
    // A malformed escape keeps the raw id; the screen will simply not find it.
  }
  if (!id) return null
  return { kind, id }
}

/**
 * Follow a link found in markdown.
 *
 * A mention routes inside the app; anything else goes to the browser as before.
 * A user mention has no screen of its own, so it stays inert rather than opening
 * something arbitrary.
 */
export function openMarkdownLink(href: string, label?: string): void {
  const mention = parseMentionHref(href)
  if (!mention) {
    void Linking.openURL(href)
    return
  }
  if (mention.kind === "note") {
    navigate("Main", {
      screen: "Notes",
      params: {
        screen: "NoteDetail",
        params: { noteId: mention.id, title: label ?? "Note" },
        initial: false,
      },
    })
    return
  }
  if (mention.kind === "file") {
    // Over the current screen, not by navigating: closing the document has to
    // give back the task it was read from, not a file list.
    openDocumentFromLink(mention.id, label)
    return
  }
  if (mention.kind === "task") {
    // A task mention carries the human identifier (COS-42) as its label, and the
    // detail screen is addressed by uuid — so the id in the href is what opens it.
    navigate("Main", {
      screen: "Tasks",
      params: {
        screen: "TaskDetail",
        params: { taskId: mention.id, title: label ?? "Task" },
        initial: false,
      },
    })
  }
}
