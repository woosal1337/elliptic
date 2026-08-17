"use client";

import * as React from "react";
import { Download, FileText, Folder, Link2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  toast,
} from "@elliptic/ui";
import { formatDateTime } from "@/lib/format";
import { ErrorState } from "@/components/error-state";
import { humanSize, mentionMarkdown } from "@/components/drive/drive-browser";
import { useDriveFile, useDriveFileText, useDriveFileUrl } from "@/hooks/use-drive-queries";
import type { DriveFile } from "@/lib/types";

/** What the browser can render in place, and how. */
function previewKind(file: DriveFile): "image" | "pdf" | "text" | "none" {
  if (file.kind === "image") return "image";
  if (file.content_type === "application/pdf") return "pdf";
  if (
    file.content_type.startsWith("text/") ||
    file.content_type === "application/json" ||
    file.content_type === "application/xml"
  ) {
    return "text";
  }
  // Word, Excel, PowerPoint, ZIP: nothing a browser renders without a converter.
  return "none";
}

function TextPreview({ orgId, fileId }: { orgId: string; fileId: string }) {
  const body = useDriveFileText(orgId, fileId);

  if (body.isPending) return <Skeleton className="h-64 w-full rounded-md" />;
  if (body.isError || !body.data?.readable || body.data.text === null) {
    return (
      <p className="rounded-md border border-border bg-subtle/40 p-3 text-caption text-muted-foreground">
        This document could not be previewed. Use Download to open it.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-subtle/40 p-3 font-mono text-caption text-foreground">
        {body.data.text}
      </pre>
      {body.data.truncated ? (
        <p className="text-caption text-muted-foreground">
          Showing the first {body.data.text.length.toLocaleString()} characters. Download for the
          whole document.
        </p>
      ) : null}
    </div>
  );
}

function Preview({ orgId, file, url }: { orgId: string; file: DriveFile; url: string }) {
  switch (previewKind(file)) {
    case "image":
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt={file.name}
          className="max-h-[60vh] w-full rounded-md border border-border object-contain"
        />
      );
    case "pdf":
      return (
        <object
          data={url}
          type="application/pdf"
          className="h-[60vh] w-full rounded-md border border-border"
          aria-label={file.name}
        >
          <p className="p-3 text-caption text-muted-foreground">
            This browser cannot display the PDF inline. Use Download to open it.
          </p>
        </object>
      );
    case "text":
      return <TextPreview orgId={orgId} fileId={file.id} />;
    default:
      return (
        <p className="rounded-md border border-border bg-subtle/40 p-3 text-caption text-muted-foreground">
          {file.content_type} has no in-browser preview. Use Download to open it in the app that
          handles it.
        </p>
      );
  }
}

/**
 * One document, opened by id — read here rather than somewhere else.
 *
 * This is where a `▤Document` mention in a task description lands: the link
 * carries `?file=<id>`, so the document opens even when the reader has never
 * browsed to the folder it sits in. The preview renders inside the dialog
 * because sending a reader to a signed storage URL in a new tab takes them out
 * of Elliptic to read something Elliptic holds. Download is still there for when
 * they want the file itself.
 */
export function DriveFileDialog({
  orgId,
  fileId,
  onClose,
}: {
  orgId: string;
  fileId: string | null;
  onClose: () => void;
}) {
  const file = useDriveFile(orgId, fileId ?? "", fileId !== null);
  const url = useDriveFileUrl(orgId, fileId ?? "", fileId !== null);

  const copyMention = async (target: DriveFile) => {
    try {
      await navigator.clipboard.writeText(mentionMarkdown(target));
      toast.success("Copied the link — paste it into a description");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <Dialog open={fileId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-3xl">
        {file.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : file.isError ? (
          <>
            <DialogHeader>
              <DialogTitle>Document</DialogTitle>
              <DialogDescription>This document could not be opened.</DialogDescription>
            </DialogHeader>
            <ErrorState error={file.error} onRetry={() => void file.refetch()} />
          </>
        ) : file.data ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-4 shrink-0 text-accent" />
                {file.data.name}
              </DialogTitle>
              <DialogDescription>
                {file.data.description ?? file.data.filename}
              </DialogDescription>
            </DialogHeader>

            {url.data ? (
              <Preview orgId={orgId} file={file.data} url={url.data.download_url} />
            ) : url.isError ? (
              <p className="rounded-md border border-border bg-subtle/40 p-3 text-caption text-muted-foreground">
                The preview link could not be created.
              </p>
            ) : (
              <Skeleton className="h-64 w-full rounded-md" />
            )}

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-small">
              <dt className="text-muted-foreground">Folder</dt>
              <dd className="flex items-center gap-1.5 text-foreground">
                <Folder className="size-3.5 text-muted-foreground" />
                {file.data.folder_path || "Drive root"}
              </dd>
              <dt className="text-muted-foreground">File</dt>
              <dd className="truncate font-mono text-caption text-foreground">
                {file.data.filename}
              </dd>
              <dt className="text-muted-foreground">Size</dt>
              <dd className="text-foreground">{humanSize(file.data.size_bytes) || "—"}</dd>
              <dt className="text-muted-foreground">Added</dt>
              <dd className="text-foreground">{formatDateTime(file.data.created_at)}</dd>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void copyMention(file.data)}>
                <Link2 className="size-4" />
                Copy link
              </Button>
              {url.data ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={url.data.download_url} download={file.data.filename}>
                    <Download className="size-4" />
                    Download
                  </a>
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
