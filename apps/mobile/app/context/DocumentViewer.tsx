import { createContext, FC, ReactNode, useCallback, useContext, useEffect, useState } from "react"

import { DocumentSheet, type ViewableDocument } from "@/components/DocumentSheet"
import { useToast } from "@/components/Toast"
import { useOrg } from "@/context/OrgContext"
import { api } from "@/services/api"

interface Viewer {
  /** Open a Drive document over whatever is on screen. */
  open: (fileId: string, title?: string) => void
}

const DocumentViewerContext = createContext<Viewer | null>(null)

/**
 * The one function that opens a Drive document, callable from outside React.
 *
 * A mention inside a description is followed by `openMarkdownLink`, which is a
 * plain function with no hooks available — the same problem `navigate()` solves
 * with a module-level ref, solved the same way.
 */
let opener: Viewer["open"] | null = null

export function openDocumentFromLink(fileId: string, title?: string): boolean {
  if (!opener) return false
  opener(fileId, title)
  return true
}

/**
 * Presents Drive documents in a sheet above the whole app.
 *
 * Above the *whole app* on purpose. The document a task description points at
 * has to be readable without leaving that task: routing to the Drive screen
 * first would leave the reader standing in a file list when they closed it,
 * which is not where they were. Mounted once here, the sheet covers whatever
 * screen asked for it and gives that screen straight back.
 */
export const DocumentViewerProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { activeOrg } = useOrg()
  const toast = useToast()
  const [viewing, setViewing] = useState<ViewableDocument | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const open = useCallback(
    (fileId: string, title?: string) => {
      if (!activeOrg) return
      // Show the sheet at once, with whatever name the caller had, and fill the
      // content in — a tap should not wait on two round trips before anything
      // moves.
      setViewing(null)
      setSheetOpen(true)
      void (async () => {
        const file = await api.getDriveFile(activeOrg.id, fileId)
        if (!file) {
          setSheetOpen(false)
          toast("That document is no longer in the Drive", { variant: "error" })
          return
        }
        // Text is decoded by the API; a WebView only gets the types it renders.
        const textual =
          file.content_type.startsWith("text/") ||
          file.content_type === "application/json" ||
          file.content_type === "application/xml"
        if (textual) {
          const body = await api.driveFileText(activeOrg.id, fileId)
          setViewing({
            name: title ?? file.name,
            contentType: file.content_type,
            url: null,
            text: body?.readable ? body.text : null,
            truncated: body?.truncated,
          })
          return
        }
        // Minted per open: the link lives 300 s, so a cached one would be dead.
        const url = await api.driveDownloadUrl(activeOrg.id, fileId)
        setViewing({
          name: title ?? file.name,
          contentType: file.content_type,
          url,
          text: null,
        })
      })()
    },
    [activeOrg, toast],
  )

  useEffect(() => {
    opener = open
    return () => {
      opener = null
    }
  }, [open])

  return (
    <DocumentViewerContext.Provider value={{ open }}>
      {children}
      <DocumentSheet
        visible={sheetOpen}
        document={viewing}
        onClose={() => {
          setSheetOpen(false)
          setViewing(null)
        }}
      />
    </DocumentViewerContext.Provider>
  )
}

export function useDocumentViewer(): Viewer {
  return useContext(DocumentViewerContext) ?? { open: () => {} }
}
