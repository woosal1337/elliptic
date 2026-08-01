"use client";

import { Download, FileDown, FileText, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  toast,
} from "@elliptic/ui";

export function NoteExportMenu({ orgId, noteId }: { orgId: string; noteId: string }) {
  const base = `/api/v1/orgs/${orgId}/notes/${noteId}`;

  const downloadBlob = async (url: string, filename: string) => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Could not export the page");
    }
  };

  const exportMarkdown = () => downloadBlob(`${base}/export.md`, "page.md");

  const exportWord = async () => {
    try {
      const res = await fetch(`${base}/export.html`, { credentials: "include" });
      if (!res.ok) throw new Error("export failed");
      const html = await res.text();
      const blob = new Blob([html], { type: "application/msword" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "page.doc";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Could not export the page");
    }
  };

  const exportPdf = async () => {
    try {
      const res = await fetch(`${base}/export.html`, { credentials: "include" });
      if (!res.ok) throw new Error("export failed");
      const html = await res.text();
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Allow pop-ups to export a PDF");
        return;
      }
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    } catch {
      toast.error("Could not export the page");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label="Export page" variant="outline">
          <Download />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={exportMarkdown}>
          <FileText className="size-4" />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportWord}>
          <FileDown className="size-4" />
          Word (.doc)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportPdf}>
          <Printer className="size-4" />
          PDF (print)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
