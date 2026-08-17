import { Linking } from "react-native"

import { openDocumentFromLink } from "@/context/DocumentViewer"
import { navigate } from "@/navigators/navigationUtilities"

import { openMarkdownLink, parseMentionHref } from "./mentionLink"

jest.mock("@/navigators/navigationUtilities", () => ({ navigate: jest.fn() }))
jest.mock("@/context/DocumentViewer", () => ({ openDocumentFromLink: jest.fn() }))

const navigateMock = navigate as jest.MockedFunction<typeof navigate>
const openDocumentMock = openDocumentFromLink as jest.MockedFunction<typeof openDocumentFromLink>

describe("parseMentionHref", () => {
  it("reads the kind and id out of a mention link", () => {
    expect(parseMentionHref("/__mention/file/abc-123")).toEqual({ kind: "file", id: "abc-123" })
    expect(parseMentionHref("/__mention/note/n1")).toEqual({ kind: "note", id: "n1" })
    expect(parseMentionHref("/__mention/task/t1")).toEqual({ kind: "task", id: "t1" })
  })

  it("decodes an escaped id", () => {
    expect(parseMentionHref("/__mention/file/a%20b")).toEqual({ kind: "file", id: "a b" })
  })

  it("reads an unknown kind as a user mention, which routes nowhere", () => {
    expect(parseMentionHref("/__mention/spreadsheet/x")).toEqual({ kind: "user", id: "x" })
  })

  it("ignores a link that is not a mention", () => {
    expect(parseMentionHref("https://example.com")).toBeNull()
    expect(parseMentionHref("/__mention/file")).toBeNull()
    expect(parseMentionHref("/__mention/file/")).toBeNull()
  })
})

describe("openMarkdownLink", () => {
  beforeEach(() => {
    navigateMock.mockClear()
    openDocumentMock.mockClear()
    jest.spyOn(Linking, "openURL").mockResolvedValue(true)
  })

  afterEach(() => jest.restoreAllMocks())

  it("opens a Drive document over the current screen, not in the browser", () => {
    openMarkdownLink("/__mention/file/doc-9", "Acme MSA")
    expect(Linking.openURL).not.toHaveBeenCalled()
    // Not a navigation: closing the document has to give back the screen it was
    // opened from, which pushing a Drive screen would not do.
    expect(navigateMock).not.toHaveBeenCalled()
    expect(openDocumentMock).toHaveBeenCalledWith("doc-9", "Acme MSA")
  })

  it("opens a page mention on the note screen", () => {
    openMarkdownLink("/__mention/note/n5", "Runbook")
    expect(navigateMock).toHaveBeenCalledWith("Main", {
      screen: "Notes",
      params: {
        screen: "NoteDetail",
        params: { noteId: "n5", title: "Runbook" },
        initial: false,
      },
    })
  })

  it("opens a task mention on the task screen", () => {
    openMarkdownLink("/__mention/task/t7", "COS-42")
    expect(navigateMock).toHaveBeenCalledWith("Main", {
      screen: "Tasks",
      params: {
        screen: "TaskDetail",
        params: { taskId: "t7", title: "COS-42" },
        initial: false,
      },
    })
  })

  it("leaves a user mention inert — it has no screen of its own", () => {
    openMarkdownLink("/__mention/user/u1", "Ege")
    expect(navigateMock).not.toHaveBeenCalled()
    expect(openDocumentMock).not.toHaveBeenCalled()
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it("still sends an ordinary link to the browser", () => {
    openMarkdownLink("https://example.com/docs", "Docs")
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com/docs")
    expect(navigateMock).not.toHaveBeenCalled()
    expect(openDocumentMock).not.toHaveBeenCalled()
  })
})
